import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { execSync } from 'child_process';
import { readFileSync, unlinkSync } from 'fs';
import { DateTime } from 'luxon';

const getGMTTimestamp = () => DateTime.utc().toFormat('dd/LLL/yyyy:HH:mm:ss +0000');

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  throw new Error('AWS credentials not defined!');
}

const s3Client = new S3Client({
  region: 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const cloudServer = process.env.APP_ENV !== 'production' ? '' : '+srv';
const user = encodeURIComponent(process.env.MONGO_USERNAME || '');
const password = encodeURIComponent(process.env.MONGO_PASSWORD || '');
const cluster = process.env.MONGO_CLUSTER;
const uri = `mongodb${cloudServer}://${user}:${password}@${cluster}`;

(async () => {
  try {
    const now = new Date();
    console.log(`[${getGMTTimestamp()}] Starting Mongo backup process`);

    const archiveName = `mongodb-backup-${now.toISOString().split('T')[0]}.gzip`;

    const objectParams = { Bucket: process.env.S3_BACKUP_BUCKET_NAME, Key: archiveName };

    const shouldBackup = await s3Client
      .send(new GetObjectCommand(objectParams))
      .then(() => {
        console.log(`[${getGMTTimestamp()}] Backup already found for today, all good!`);
        return false;
      })
      .catch(() => {
        console.log(`[${getGMTTimestamp()}] Backup not found for today, trying to backup`);
        return true;
      });

    if (shouldBackup) {
      console.log(`[${getGMTTimestamp()}] creating dump into "${archiveName}"`);

      execSync(`mongodump --archive=${archiveName} --gzip --uri=${uri}`);

      const fileBuffer = readFileSync(archiveName);

      console.log(`[${getGMTTimestamp()}] uploading "${archiveName}"`);
      await s3Client.send(new PutObjectCommand({ ...objectParams, Body: fileBuffer }));

      console.log(`[${getGMTTimestamp()}] deleting "${archiveName}"`);
      await unlinkSync(archiveName);
      console.log(`[${getGMTTimestamp()}] Mongo dump successfully created!`);
    }
  } catch (backupError) {
    console.error(`[${getGMTTimestamp()}] Backup Error!`, backupError);
  }
})();
