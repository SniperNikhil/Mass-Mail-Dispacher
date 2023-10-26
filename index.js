const express = require("express");
const path = require("path");
const hbs = require("hbs");
const xlsx = require('xlsx');
const app = express();
port = 4001;

require('dotenv').config();

const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Define the destination folder for file uploads

const publicDir = path.join(__dirname, './public')
app.use(express.static(publicDir))
app.set('view engine', 'hbs')

const index = path.join(__dirname, './views')
app.set(express.static(index))
app.get('/', async (req, res) => {
    try {
        res.render('index', {});
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching teachers data.');
    }
});

function isValidEmail(email) {
    // You can add a more sophisticated email validation here if needed.
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
}

app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const filePath = req.file.path;

        // Read the Excel file and extract data
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: true });

        // Get the header row (first row) of the sheet
        const headerRow = sheetData[0];

        // Fetch the column name (as there is only one column)
        const columnName = Object.keys(headerRow)[0];
        const dataToInsert = sheetData.map((item) => {
            return {
                email: item[columnName],
            };
        });

        // Filter valid and invalid emails
        const validEmails = [];
        const invalidEmails = [];
        dataToInsert.forEach((item) => {
            if (isValidEmail(item.email)) {
                validEmails.push(item.email);
            } else {
                invalidEmails.push(item.email);
            }
        });

        // Send the filtered email lists as the server response
        res.render('index', {
            validEmails,
            invalidEmails
        })
    } catch (error) {
        console.error('Error processing the file:', error);
        res.status(500).send('Error processing the file.');
    }
});

const nodemailer = require('nodemailer');
app.use(express.urlencoded({ extended: true }));
app.post('/sendemails', async (req, res) => {
    // Assuming validEmails is an array of objects with the structure { email: 'email address' }
    const validEmailsArray = req.body.validEmails;

    let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.user,
            pass: process.env.pass,
        },
    });

    // Create an array of Promises to send emails
    const emailPromises = validEmailsArray.map((email) => {
        const mailOptions = {
            from: 'bulkemail@gmail.com', // Replace with your Gmail email address
            to: email,
            subject: 'Test Email', // Replace with your email subject
            text: 'This is a test email.', // Replace with your email content
        };
        return transporter.sendMail(mailOptions);
    });

    // Use Promise.all to send all emails asynchronously
    await Promise.all(emailPromises);

    console.log(`Emails sent to all recipients.`);

    res.send('Emails sent successfully.');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});