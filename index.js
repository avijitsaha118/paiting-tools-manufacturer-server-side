const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gdmi3.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {
    try {
        await client.connect();
        const itemCollection = client.db('tools-manufacturer').collection('items');
        const bookingCollection = client.db('tools-manufacturer').collection('bookings');
        const userCollection = client.db('tools-manufacturer').collection('users');
        const productCollection = client.db('tools-manufacturer').collection('products');
        const reviewCollection = client.db('tools-manufacturer').collection('reviews');
        const profileCollection = client.db('tools-manufacturer').collection('profiles');

        const verifyAdmin = async (req, res, next) => {

            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                next();
            }
            else {
                return res.status(403).send({ message: 'forbidden access' })
            }
        }

        //ITEMS API 
        app.get('/item', async (req, res) => {
            const query = {};
            const cursor = itemCollection.find(query);
            const items = await cursor.toArray();
            res.send(items);
        });

        app.get('/item/:id', async (req, res) => {
            const id = req.params.id;

            const query = { _id: ObjectId(id) };
            const item = await itemCollection.findOne(query);
            res.send(item);
        });

        //updated quantity


        app.put('/item/:id', async (req, res) => {
            const id = req.params.id;
            const updatedItem = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    quantity: updatedItem.quantity
                }
            };
            const result = await itemCollection.updateOne(filter, updatedDoc, options);
            res.send(result);

        });

        app.get('/user', async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        });

        // app.get('/admin/:email', async (req, res) => {
        //     const email = req.params.email;
        //     const user = await userCollection.findOne({ email: email });
        //     const isAdmin = user.role === 'admin';
        //     res.send({ admin: isAdmin });
        // })

        // app.get('/booking', verifyJWT, async (req, res) => {
        //     const buyer = req.query.buyer;
        //     const decodedEmail = req.decoded.email;
        //     if (buyer === decodedEmail) {
        //         const query = { buyer: buyer };
        //         const bookings = await bookingCollection.find(query).toArray();
        //         return res.send(bookings);
        //     }
        //     else {
        //         return res.status(403).send({ message: 'forbidden access' })
        //     }

        // });

        app.get('/booking', async (req, res) => {
            const cursor = await bookingCollection.find({}).toArray()
            res.send(cursor)
        });

        app.post('/booking', async (req, res) => {
            const booking = req.body;
            // const query = { toolName: booking.toolName, buyer: booking.buyer }
            // const exists = await bookingCollection.findOne(query);
            // if (exists) {
            //     return res.send({ success: false, booking: exists })
            // }
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        });

        app.get('/booking/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const booking = await bookingCollection.findOne(query);
            res.send(booking);

        });

        app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            // const requester = req.decoded.email;
            // const requesterAccount = await userCollection.findOne({ email: requester });
            // if (requesterAccount.role === 'admin') {
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await userCollection.updateOne(filter, updateDoc);

            res.send(result);
            // }
        });

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '10D' })
            res.send({ result, token });
        });


        app.get('/product', verifyJWT, verifyAdmin, async (req, res) => {
            const products = await productCollection.find().toArray();
            res.send(products);
        });


        app.post('/product', verifyJWT, verifyAdmin, async (req, res) => {
            const product = req.body;
            const result = await productCollection.insertOne(product);
            res.send(result);
        });

        app.delete('/product/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const result = await productCollection.deleteOne(filter);
            res.send(result);
        });


        //review api

        app.get('/myreview', async (req, res) => {
            // const email = req.query.email;
            const query = {};
            const cursor = reviewCollection.find(query);
            const myReviews = await cursor.toArray();
            res.send(myReviews);

        });

        app.post('/myreview', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result);
        });

        app.get('/myprofile', async (req, res) => {
            // const email = req.query.email;
            const query = {};
            const cursor = profileCollection.find(query);
            const myProfiles = await cursor.toArray();
            res.send(myProfiles);

        });

        app.post('/myprofile', async (req, res) => {
            const profile = req.body;
            const result = await profileCollection.insertOne(profile);
            res.send(result);
        });

        app.put('/myprofile/:id', async (req, res) => {
            const id = req.params.id;
            const updatedUser = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    name: updatedUser.name,
                    email: updatedUser.email,
                    education: updatedUser.education,
                    location: updatedUser.location,
                    phone: updatedUser.phone,
                    linkedin: updatedUser.linkedin,
                    img: updatedUser.img
                }
            };
            const result = await profileCollection.updateOne(filter, updatedDoc, options);
            res.send(result);

        })

    }

    finally {

    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Running tools manufacturer server');
});

app.listen(port, () => {
    console.log('listening to port', port);
});
