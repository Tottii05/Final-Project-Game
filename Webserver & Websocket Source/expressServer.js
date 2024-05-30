const express = require("express");
const path = require('path');

module.exports = class expressServer {
    constructor (host = "0.0.0.0", port = 80)
    {
        this.host = host;
        this.port = port;

        const app = express();
        app.use(express.static(path.join(__dirname, 'public')));

        app.get('/', (req, res) => {
            res.sendFile('index.html', { root: 'public' });
        });
        
        app.get('/scores', (req, res) => {
            res.sendFile('scores.html', { root: 'public' });
        });
        
        app.get('/login', (req, res) => {
            res.sendFile('login.html', { root: 'public' });
        });
        
        app.get('/profile', (req, res) => {
            res.sendFile('profile.html', { root: 'public' });
        });
        
        app.get('/admin', (req, res) => {
            res.sendFile('admin.html', { root: 'public' });
        });
        
        app.listen(80, "0.0.0.0", () => {
            console.log('Express webserver started on http://0.0.0.0:80');
        });
    }
}