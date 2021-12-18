const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const cors = require('cors');
const admin = require("firebase-admin");
const ObjectId = require('mongodb').ObjectId;

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.voxe2.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith('Bearer ')) {
      const token = req.headers.authorization.split(' ')[1];

      try {
          const decodedUser = await admin.auth().verifyIdToken(token);
          req.decodedEmail = decodedUser.email;
      }
      catch {

      }

  }
  next();
}


async function run() {
  try {
      await client.connect();
      const database = client.db('AwesomeFurniture');
      const usersCollection = database.collection('users');
      const productsCollection = database.collection('products');
      const ordersCollection = database.collection('orders');
      const commentCollection = database.collection('comments');


      // save users data
       app.post('/users', async (req, res) => {
        const user = req.body;
        const result = await usersCollection.insertOne(user);
        res.json(result);
      });

      // save users data when register using google
      app.put('/users', async (req, res) => {
        const user = req.body;
        const filter = { email: user.email };
        const options = { upsert: true };
        const updateDoc = { $set: user };
        const result = await usersCollection.updateOne(filter, updateDoc, options);
        res.json(result);
      });

      // get user by email admin or not
      app.get('/users/:email', async (req, res) => {
        const email = req.params.email;
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        let isAdmin = false;
        if (user?.role === 'admin') {
            isAdmin = true;
        }
        res.json({ admin: isAdmin });
      })
      
      // Make admin API
      // app.put('/users/admin', async (req, res) => {
      //   const user = req.body;
      //   const filter = { email: user.email };
      //   const updateDoc = { $set: { role: 'admin' } };
      //   const result = await usersCollection.updateOne(filter, updateDoc);
      //   res.json(result);
      // })

      app.put('/users/admin', verifyToken, async (req, res) => {
        const user = req.body;
        const requester = req.decodedEmail;
        if (requester) {
            const requesterAccount = await usersCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                const filter = { email: user.email };
                const updateDoc = { $set: { role: 'admin' } };
                const result = await usersCollection.updateOne(filter, updateDoc);
                res.json(result);
            }
        }
        else {
            res.status(403).json({ message: 'You are permitted make admin another.' })
        }

    })

      // Make admin API
      app.put('/users/admin', async (req, res) => {
        const user = req.body;
        const filter = { email: user.email };
        const updateDoc = { $set: { role: 'admin' } };
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.json(result);
      })

      // POST API for products
      app.post('/products', async (req, res) => {
        const product = req.body;
        const result = await productsCollection.insertOne(product);
        console.log(result);
        res.json(result)
      }); 

      // GET API for all products
      app.get('/products', async (req, res) => {
        const cursor = productsCollection.find({});
        const products = await cursor.toArray();
        res.send(products);
      });

      // GET API for a single product
      app.get('/products/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const product = await productsCollection.findOne(query);
        res.json(product);
      });

      // DELETE API for manage products 
      app.delete('/products/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const result = await productsCollection.deleteOne(query);
        res.json(result);
      });

      // POST API place order 
      app.post('/orders', async (req, res) => {
        const order = req.body;
        const result = await ordersCollection.insertOne(order);
        console.log(result);
        res.json(result)
      });

      // GET API for all orders
      app.get('/orders', async (req, res) => {
        const cursor = ordersCollection.find({});
        const orders = await cursor.toArray();
        res.send(orders);
      });

      // Approved order status shipped
      app.put('/orders/:id', async (req, res) => {
        const id = req.params.id;
        const filter = { _id: ObjectId(id) };
        const options = { upsert: true };
        const updateDoc = { $set: { status: 'Shipped' } };
        const result = await ordersCollection.updateOne(filter, updateDoc, options);
        res.json(result);
      })

      // DELETE API for manage orders
      app.delete('/orders/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const result = await ordersCollection.deleteOne(query);
        res.json(result);
      });

      // my orders
      app.get("/myOrders/:email", async (req, res) => {
        const result = await ordersCollection.find({
          email: req.params.email,
        }).toArray();
        res.send(result);
      }); 

      // DELETE API for my orders
      app.delete('/orders/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const result = await ordersCollection.deleteOne(query);
        res.json(result);
      });

      // POST API for comment
      app.post('/comment', async (req, res) => {
        const comment = req.body;
        const result = await commentCollection.insertOne(comment);
        console.log(result);
        res.json(result)
      });

      // GET API for user given comment
      app.get('/comment', async (req, res) => {
        const cursor = commentCollection.find({});
        const comment = await cursor.toArray();
        res.send(comment);
      });  

    }
      finally {
          // await client.close();
      }
    }

    run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Running Awesome Furniture server 17/12/2021 06:17 pm');
});

app.listen(port, () => {
  console.log('Running Awesome Furniture server on port ', port);
})