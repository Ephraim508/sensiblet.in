// Import required modules
const express = require("express");
const dotenv = require("dotenv");
const { MongoClient, ObjectId } = require("mongodb");
const bodyParser = require("body-parser");

// Load environment variables from .env file
dotenv.config();

// Initialize the express app
const app = express();
const PORT = process.env.PORT || 5000;
app.use(bodyParser.json()); // Use bodyParser after initializing the app

// MongoDB client setup
let db;

// Connect to MongoDB
MongoClient.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then((client) => {
    db = client.db("transaction_db");  // Use 'transaction_db' database
    console.log("MongoDB connected");

    // Start the server after successful connection
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

// POST /api/transactions: Create a new transaction
app.post("/api/transactions", async (req, res) => {
  try {
    const { amount, transaction_type, user } = req.body;

    // Ensure the required fields are provided
    if (!amount || !transaction_type || !user) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Ensure user is an integer
    const userId = parseInt(user, 10);

    // Create a new transaction object
    const newTransaction = {
      amount,
      transaction_type,
      user: userId,  // Store user as an integer
      timestamp: new Date(),
      status: "PENDING",
    };

    // Insert the new transaction into the MongoDB collection
    const result = await db.collection("transactions").insertOne(newTransaction);

    // Return the newly created transaction
    res.status(201).json({
      transaction_id: result.insertedId,
      amount,
      transaction_type,
      user: userId,
      timestamp: newTransaction.timestamp,
      status: "PENDING",
    });
  } catch (err) {
    console.error("Error creating transaction:", err);
    res.status(500).json({ error: "Error creating transaction" });
  }
});

// GET /api/transactions: Retrieve transactions for a specific user
app.get("/api/transactions", async (req, res) => {
  try {
    const { user_id } = req.query;

    // Ensure user_id is provided and is an integer
    const userId = parseInt(user_id, 10);
    if (!userId) {
      return res.status(400).json({ error: "User ID is required and must be an integer" });
    }

    // Fetch the transactions for the specific user
    const transactions = await db
      .collection("transactions")
      .find({ user: userId })
      .toArray();

    // Return the transactions as JSON
    res.status(200).json({ transactions });
  } catch (err) {
    console.error("Error fetching transactions:", err);
    res.status(500).json({ error: "Error fetching transactions" });
  }
});

// PUT /api/transactions/:id: Update the status of a transaction
app.put("/api/transactions/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!status || !["COMPLETED", "FAILED"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Update the transaction status in the MongoDB collection
    const result = await db
      .collection("transactions")
      .updateOne({ _id: new ObjectId(id) }, { $set: { status } });

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Return the updated transaction
    const updatedTransaction = await db
      .collection("transactions")
      .findOne({ _id: new ObjectId(id) });

    res.status(200).json(updatedTransaction);
  } catch (err) {
    console.error("Error updating transaction status:", err);
    res.status(500).json({ error: "Error updating transaction status" });
  }
});

// GET /api/transactions/:id: Retrieve a specific transaction by ID
app.get("/api/transactions/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the transaction by ID
    const transaction = await db
      .collection("transactions")
      .findOne({ _id: new ObjectId(id) });

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Return the transaction details
    res.status(200).json(transaction);
  } catch (err) {
    console.error("Error fetching transaction:", err);
    res.status(500).json({ error: "Error fetching transaction" });
  }
});
