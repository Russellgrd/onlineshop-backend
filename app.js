if(process.env.NODE_ENV !== 'production'){
    require('dotenv').config();
}
const express = require('express');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const bodyParser = require('body-parser');
const mysql = require('mysql');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_TEST);
const moment = require('moment');
const YOUR_DOMAIN = 'http://localhost:3000';
const app = express();

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

const PORT = process.env.PORT || 4242;

app.use(cors({
    origin:"*"
}));
app.use(bodyParser.urlencoded({
    extended: true
  }));
app.use(express.static('public'));
app.use(bodyParser.json())
app.use(express.json());


app.get('/getproducts', (req, res) => {
        console.log(req.body);
        let sqlQuery = `SELECT * FROM PRODUCTS`
        db.query(sqlQuery, (err, data) => {
            if(err) {
                res.statusCode = 400;
                res.send(err.message);
            } else {
                res.statusCode = 200;
                res.json(data);
            }
        })
})



    app.post('/create-checkout-session', async (req, res) => {
        console.log('hit this checkout sessions block');
        console.log(req.body);
        let data = {
            success:"successfully purchased"
        }
        res.json({data});

        // const session = await stripe.checkout.sessions.create({
        //   line_items: [
        //     {
        //       // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
        //       price: '{{PRICE_ID}}',
        //       quantity: 1,
        //     },
        //   ],
        //   mode: 'payment',
        //   success_url: `${YOUR_DOMAIN}?success=true`,
        //   cancel_url: `${YOUR_DOMAIN}?canceled=true`,
        // });
      
        // res.redirect(303, session.url);
      });

    app.post('/createnewuser',(req, res) => {

        console.log(req.body);
        db.query('SELECT * FROM USERS WHERE email = ?',[req.body.email], (err, data) => {
            if(err) {
                console.log('hit error block')
                res.writeHead(503, {
                    'Content-Type:':'application/json'
                });
                res.json({"server error":err.message});
                return;
            }
            if(data.length >= 1) {
                console.log('hit normal block');
                console.log('array item is',data[0]);
                res.set('Content-Type', 'application/json');
                res.json({"conflict":"username already exists"});
                return;
            };

            bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
                if(err) {
                    console.log('hit 2nd error block')
                    res.writeHead(503, {
                        'Content-Type:':'application/json'
                    });
                    res.json({"server error":err.message});
                    return;
                }
                var sql = `INSERT INTO USERS (firstname,lastname, email, datejoined, hashedpassword) VALUES ('${req.body.firstname}','${req.body.lastname}','${req.body.email}','${moment().format('YYYY-DD-MM')}','${hash}');`;
                console.log(sql);
                db.query(sql, (err, data) => {
                    if(err){
                        console.log('error');
                        console.log(err);
                    } else {
                        console.log(data);
                        res.json({"message":"user successfully created"});
                    }
                }) 
            });
        
        })
    })

    



app.listen(PORT, () => {
    console.log('listening on ' + PORT);
})
