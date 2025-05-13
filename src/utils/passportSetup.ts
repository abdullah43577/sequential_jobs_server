import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/users.model";
import { generateUsername } from "./generateUserName";

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;

export const passportSetup = function () {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID as string,
        clientSecret: GOOGLE_CLIENT_SECRET as string,
        callbackURL: process.env["NODE_ENV"] === "development" ? "http://localhost:8080/api/auth/google/callback" : "https://sequential-jobs-server.onrender.com/api/auth/google/callback",
        passReqToCallback: true,
      },
      async function (req, _accessToken, _refreshToken, profile, done) {
        try {
          const { id, name, emails, _json } = profile;

          const role = req.query.role as "company" | "job-seeker";

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

          // Set up trial period - 30 days from now
          const currentDate = new Date();
          const trialEndDate = new Date();
          trialEndDate.setDate(currentDate.getDate() + 30);

          const newUser = new User({
            first_name: name?.givenName,
            lastName: name?.familyName,
            email: emails?.[0].value,
            profile_pic: _json.picture || null,
            role,
            googleId: id,
            has_validated_email: true,
            organisation_name: name?.givenName,
            // Add trial subscription details
            subscription_tier: "Sequential Super Pro", // Highest tier
            subscription_status: "trial",
            subscription_start: currentDate,
            subscription_end: trialEndDate,
            is_trial: true,
          });

          if (role === "company") {
            newUser.username = generatedUserName;
          }

          await newUser.save();

          done(null, newUser);
        } catch (error) {
          done(error, undefined);
        }
      }
    )
  );
};
