import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/users.model";

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;

export const passportSetup = function () {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID as string,
        clientSecret: GOOGLE_CLIENT_SECRET as string,
        callbackURL: process.env["NODE_ENV"] === "development" ? "http://localhost:8080/auth/google/callback" : "https://sequential-jobs-server.onrender.com/auth/google/callback",
        passReqToCallback: true,
      },
      async function (req, _accessToken, _refreshToken, profile, done) {
        try {
          const { id, name, emails, _json } = profile;

          const role = req.query.role || "job-seeker";

          const existingUser = await User.findOne({ googleId: id });
          if (existingUser) {
            if (existingUser.isLocked) {
              return done(null, false, { message: "Your account is locked due to many failed login attempts. Please contact support." });
            } else {
              return done(null, existingUser);
            }
          }

          if (!_json.email_verified) return done(null, false, { message: "Please verify your email with google and try again!!" });

          const newUser = await User.create({
            first_name: name?.givenName,
            lastName: name?.familyName,
            email: emails?.[0].value,
            profile_pic: _json.picture || null,
            role,
            googleId: id,
            has_validated_email: true,
            organisation_name: name?.givenName,
          });

          done(null, newUser);
        } catch (error) {
          done(error, undefined);
        }
      }
    )
  );

  // storing current user id
  passport.serializeUser((user, done) => {
    done(null, (user as any)._id);
  });

  // return user by id when requested
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      if (user) {
        done(null, user);
      } else {
        done(null, false);
      }
    } catch (error) {
      done(error, undefined);
    }
  });
};
