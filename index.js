const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const PDFParser = require('pdf-parse');
require('dotenv').config();

const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = 3000 || process.env.PORT;

// Set EJS as the view engine
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Set up Multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Route to render the form
app.get('/', (req, res) => {
    res.render('index.ejs', { history: [] });
});

// Route for parsing uploaded PDF
app.post('/parse-pdf', upload.single('pdfFile'), async (req, res) => {
    try {
        const pdfBuffer = req.file.buffer;
        const data = await PDFParser(pdfBuffer);
        const pdfText = data.text;
        console.log(pdfText);

        const queryCode = `summarize the pdf text in 50 words ${pdfText} but don't include any special characters`;

        const API_KEY = 'AIzaSyCeGzZmKaRE5p5LuhatyKTP7z42gSHTt54';
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

        const generationConfig = {
            temperature: 1,
            topK: 0,
            topP: 0.95,
            maxOutputTokens: 8192,
        };

        const chat = model.startChat({
            generationConfig,
            history: [
                { role: 'user', parts: [{ text: queryCode }] },
            ],
        });

        // Generate code
        const resultCode = await chat.sendMessage(queryCode);
        const convertedCode = resultCode.response.text();

        // Render the formatted code and documentation in the view template
        res.render('index.ejs', {
            code: convertedCode,
            history: [
                { role: 'user', parts: [{ text: queryCode }] },
                { role: 'model', parts: [{ text: convertedCode }] },
            ]
        });
    } catch (error) {
        console.error('Error:', error.message);
    }
});

// Route for answering questions
app.post('/answer-question', async (req, res) => {
    try {
        const question = req.body.question;
        const history = JSON.parse(req.body.history);

        const API_KEY = 'AIzaSyCeGzZmKaRE5p5LuhatyKTP7z42gSHTt54';
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

        const generationConfig = {
            temperature: 1,
            topK: 0,
            topP: 0.95,
            maxOutputTokens: 8192,
        };

        const chat = model.startChat({
            generationConfig,
            history: history,
        });

        const result = await chat.sendMessage(question);
        const answer = result.response.text();

        // Update the conversation history
        history.push({ role: 'user', parts: [{ text: question }] });
        history.push({ role: 'model', parts: [{ text: answer }] });

        res.render('index.ejs', {
            answer: answer,
            history: history
        });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send('Error answering the question');
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});