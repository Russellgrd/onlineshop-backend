if(process.env.NODE_ENV !== 'production'){
    require('dotenv').config();
}

const express = require('express');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const uuid = require('uuid').v4
const bodyParser = require('body-parser');
const mysql = require('mysql');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_TEST);
const moment = require('moment');
const jwt = require('jsonwebtoken');
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

    app.get('/item-description:id', (req, res) => {
        let id = req.params.id;
        console.log('ID IS ', id);
        let sqlQuery = `SELECT * FROM PRODUCTS WHERE id=`+id;
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


    app.post('/createnewuser',(req, res) => {
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
                let sql = `INSERT INTO USERS (firstname,lastname, email, datejoined, hashedpassword) VALUES ('${req.body.firstname}','${req.body.lastname}','${req.body.email}','${moment().format('YYYY-MM-DD')}','${hash}');`;
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

    app.post('/userlogin', (req, res) => {
        let { email, password } = req.body;
        db.query('SELECT * FROM USERS WHERE email = ?',[email],async (err, data) => {
            if(err) {
                console.log('hit error block')
                console.log(err);
                res.setHeader('statusCode',503);
                res.setHeader('Content-Type', 'application/json');  
                res.json({"server error":err.message});
            } else {
                const match = await bcrypt.compare(password, data[0].hashedpassword);
                if(match) {
                    let token = jwt.sign({email}, process.env.JWT_SECRET);
                    res.setHeader('statusCode',200);
                    res.setHeader('Content-Type','application/json');
                    res.json({"message":"successful","jwtToken":token, email:email});
                }
            }
        })
     })

     app.get('/config', (req, res) => {
        res.send({
          publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        });
      });


    const calculateOrderAmount = (items) => {
        // Replace this constant with a calculation of the order's amount
        // Calculate the order total on the server to prevent
        // people from directly manipulating the amount on the client
        return 1400;
        };




     app.post('/create-payment-intent', async (req, res) => {
        const { items, amount } = req.body;
        console.log(items);
        try {
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount * 100,
                currency: "eur",
                automatic_payment_methods: {
                  enabled: true,
                },
              });
              res.send({
                clientSecret: paymentIntent.client_secret,
              });
        } catch(err) {
            res.status(400).send('error on stripe paymentIntents', err);
        }

     })

     app.post('/purchasecomplete', (req, res) => {
        console.log('BODY', req.body);
        let items = req.body.items.map((item) => {
            return [item.id, item.description];
        });
        let address = req.body.address;
        let stringAddress = `${address.line1} ${address.line2} ${address.city} ${address.country} ${address.postal_code}`;
        let sql = `INSERT INTO ORDERS (order_id,username,date,amount, address, items) VALUES ('${req.body.orderId}','${req.body.username}','${moment().format('YYYY-MM-DD')}','${req.body.totalCost}','${stringAddress}','${JSON.stringify(items)}');`;
        db.query(sql, (err, data) => {
            if(err){
                console.log('error', err);
                res.status(500).json({err});
            } else {
                console.log(data);
                res.json({"message":"payment successfully made"});
            }
        }) 
     });



     function authenticateToken (req, res, next) {
        const authHeader = req.headers['authorization'];
        const token = authHeader &&  authHeader.split(' ')[1];
        if(token == null) return res.sendStatus(401);
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if(err) return res.sendStatus(403);
            req.user = user;
            next();
        });
    }



app.listen(PORT, () => {
    console.log('listening on ' + PORT);
})
