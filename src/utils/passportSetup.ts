import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/users.model";
import { generateUsername } from "./generateUserName";
import { queueEmail } from "../workers/globalEmailQueueHandler";
import { JOB_KEY } from "../workers/jobKeys";

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = process.env;

export const passportSetup = function () {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID as string,
        clientSecret: GOOGLE_CLIENT_SECRET as string,
        callbackURL: GOOGLE_CALLBACK_URL,
        passReqToCallback: true,
      },
      async function (req, _accessToken, _refreshToken, profile, done) {
        try {
          const { id, name, emails, _json } = profile;

          const role = req.query.state as "company" | "job-seeker";

          if (role !== "company" && role !== "job-seeker") return done(null, false, { message: "Only Employers and Job Seekers can either create or login with the Google workflow" });

          let existingUser = await User.findOne({ googleId: id });
          if (existingUser) {
            if (existingUser.isLocked) {
              return done(null, false, { message: "Your account is locked due to many failed login attempts. Please contact support." });
            } else {
              return done(null, existingUser);
            }
          }

          // No user with this Google ID, check if email exists
          if (emails && emails.length > 0) {
            const email = emails[0].value;

            existingUser = await User.findOne({ email });

            if (existingUser) {
              existingUser.googleId = id;

              if (!existingUser.has_validated_email) existingUser.has_validated_email = true;

              //* generate username if user doesn't have already
              if (!existingUser.username) {
                const generatedUserName = await generateUsername(existingUser.first_name, existingUser.last_name);
                existingUser.username = generatedUserName;
              }

              await existingUser.save();
              return done(null, existingUser);
            }
          }

          if (!_json.email_verified) return done(null, false, { message: "Please verify your email with google and try again!!" });

          const generatedUserName = await generateUsername(name?.givenName || "", name?.familyName || "");

          const newUser = new User({
            first_name: name?.givenName,
            last_name: name?.familyName,
            email: emails?.[0].value,
            profile_pic: _json.picture || null,
            role,
            googleId: id,
            has_validated_email: true,
          });

          // Set up trial period - 30 days from now
          const currentDate = new Date();
          const trialEndDate = new Date();
          trialEndDate.setDate(currentDate.getDate() + 30);

          if (role === "company") {
            newUser.username = generatedUserName;
            newUser.subscription_tier = "Sequential Super Pro";
            newUser.subscription_status = "trial";
            newUser.subscription_start = new Date();
            newUser.subscription_end = trialEndDate;
            newUser.is_trial = true;
            newUser.organisation_name = name?.givenName || "";
          }

          await newUser.save();

          const payload = {
            email: emails?.[0].value,
            name: name?.givenName,
            subcriptionPlan: "Sequential Super Pro",
            trialDays: 30,
          };

          if (role === "company") {
            await queueEmail(JOB_KEY.REGISTRATION_OAUTH, payload);
          } else {
            await queueEmail(JOB_KEY.REGISTRATION_OAUTH_SEEKER, payload);
          }

          done(null, newUser);
        } catch (error) {
          done(error, undefined);
        }
      }
    )
  );
};
