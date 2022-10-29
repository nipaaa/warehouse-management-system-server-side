const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();

//middleware
app.use(cors());
app.use(express.json());

function verifyJWT(req, res, next){
    const authHeader = req.header.authorization;
    if (!authHeader) {
        return res.status(401).send({message: 'unauthorized access'})
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({message: 'forbidden access'})
        }
        console.log('decoded', decoded);
        req.decoded = decoded;
        next();

    })
   
}



const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@cluster0.y4gbi.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        await client.connect();
        const itemsCollection = client.db('warehouse-dress').collection('items');
        const orderCollection = client.db('warehouse-dress').collection('order');

        //AUTH
        app.post('/login' , async(req, res) => {
            const user = req.body;
            const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1d'
            });
            res.send({accessToken});
        })
       
        app.get('/inventory' , async(req, res) => {
            const query = {};
            const cursor = itemsCollection.find(query);
            const item = await cursor.toArray();
            res.send(item);
            
        });

        app.get('/inventory/:id' , async(req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const item = await itemsCollection.findOne(query);
            res.send(item);
        });

        //POST
        app.post('/inventory', async(req, res) => {
            const newItem = req.body;
            const result = await itemsCollection.insertOne(newItem);
            res.send(result)
        });

        //DELETE
        app.delete('/inventory/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await itemsCollection.deleteOne(query);
            res.send(result);
        })

        //delivered and stock
        app.put('/inventory/:id', async(req, res) => {
            const id = req.params.id;
            const updateQuantity = req.body;
            const filter = {_id: ObjectId(id)};
            const options = {upsert: true};
            const updateDoc = {
                $set:{
                    quantity: updateQuantity.quantity
                }
            }
            const result = await itemsCollection.updateOne(filter,updateDoc,options);
            res.send(result);
        })

        //addItem
        app.get('/addItem' , verifyJWT , async(req, res) =>{
            const decodedEmail = req.decoded.email;
            const email = req.query.email;
            if (email === decodedEmail) {
                const query = {email: email};
            const cursor = orderCollection.find(query);
            const item = await cursor.toArray();
            res.send(item); 
            } else {
                res.status(403).send({message: 'forbidden access'})
            }
           

        })
        app.post('/addItem', async(req, res) => {
            const newItem = req.body;
            const result = await orderCollection.insertOne(newItem);
            res.send(result)
        });

        //myitem
        app.get('/myitems', verifyJWT, async(req, res) => {
            const decodedEmail = req.decoded.email;
            const email = req.query.email;
            console.log(decodedEmail);
            if (email === decodedEmail) {
            const query = {email: email};
            const cursor = itemsCollection.find(query);
            const myItems = await cursor.toArray() ;
            res.send(myItems);
            } 
        });
        app.delete('/myitems/:id', async(req, res) =>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await itemsCollection.deleteOne(query);
            res.send(result);
        });

    }
    finally{

    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Warehouse server')
});

app.listen(port, () => {
    console.log('listening to port', port);
})
