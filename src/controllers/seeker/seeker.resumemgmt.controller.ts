import { Response } from "express";
import { IUserRequest } from "../../interface";
import cloudinary from "../../utils/cloudinaryConfig";
import User from "../../models/users.model";
import { handleErrors } from "../../helper/handleErrors";
import { Readable } from "stream";

//* RESUME MANAGEMENT
const uploadResume = async function (req: IUserRequest, res: Response) {
  try {
    const { userId, role } = req;
    const resume = req.file;
    if (!resume) return res.status(404).json({ message: "No File Uploaded" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found!" });

    // Upload file directly to Cloudinary using the buffer
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `users/${role}/${userId}/resume`,
        resource_type: "auto",
      },
      async (error, result) => {
        if (error) {
          return res.status(500).json({ message: "Cloudinary upload failed" });
        }

        if (result?.secure_url) {
          user.resume = result.secure_url;
          await user.save();

          res.status(200).json({ message: "Resume Upload Success", url: result.secure_url });
        }
      }
    );

    // Create a readable stream from the buffer and pipe it to Cloudinary
    const bufferStream = new Readable();
    bufferStream.push(resume.buffer); // Push the file buffer into the stream
    bufferStream.push(null); // End of stream
    bufferStream.pipe(stream);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const deleteResume = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ emssage: "User not found!" });

    // Delete from Cloudinary if resumeId exists
    if (user.resumeId) {
      await cloudinary.uploader.destroy(user.resumeId, {
        resource_type: "auto", // optional, safe to include
      });
    }

    user.resume = null;
    user.resumeId = null;
    await user.save();

    res.status(200).json({ message: "Resume Deleted Successfully" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { uploadResume, deleteResume };
