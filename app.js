const http = require('http');
const mysql = require('mysql');

const db = mysql.createConnection({
    host:'localhost',
    user:'root',
    database:'shop'
});

db.connect((err) => {
    if(err) {
        console.log(err.message);
        return;
    }
    console.log('connected to your mySql database');
})

const server = http.createServer((req, res) => {

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
        'Access-Control-Max-Age': 2592000, // 30 days
        /** add other headers as per requirement */
      };
      if (req.method === 'OPTIONS') {
        res.writeHead(204, headers);
        res.end();
        return;
      }
      if (['GET', 'POST'].indexOf(req.method) > -1) {
        if(req.url === '/getproducts')
        db.query('SELECT * FROM PRODUCTS', (err, data) => {
            if(err) {
                res.statusCode = 400;
                res.end(err.message);
            } else {
                res.writeHead(200, headers);
                res.end(JSON.stringify(data));
            }
        })
      }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log('listening on port ' + PORT);
});

