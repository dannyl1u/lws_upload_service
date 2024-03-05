import { Storage } from "@google-cloud/storage";
import fs from "fs";

const storage = new Storage({
    projectId:   'cmpt471',
	keyFilename: './cloud_credentials.json'
});

const bucketName = "lws-bucket-1";

export const uploadFile = async (filePath: string, fileName: string) => {
    await storage.bucket(bucketName).upload(filePath, {
        destination: fileName,
    });
    console.log(`${filePath} uploaded to ${bucketName}/${fileName}.`);
};