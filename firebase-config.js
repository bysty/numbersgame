// Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // Replace with your Firebase API key
  authDomain: "numbers-game-app.firebaseapp.com",
  projectId: "numbers-game-app",
  storageBucket: "numbers-game-app.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get Firestore instance
const db = firebase.firestore();

// Players collection reference
const playersCollection = db.collection('players');

// Guesses collection reference
const guessesCollection = db.collection('guesses');

// Add a new player to the database
async function addPlayer(name) {
  try {
    const playerData = {
      name: name,
      games_played: 0,
      win_count: 0,
      loss_count: 0,
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await playersCollection.add(playerData);
    return { id: docRef.id, ...playerData };
  } catch (error) {
    console.error("Error adding player: ", error);
    return null;
  }
}

// Get all players from the database
async function getAllPlayers() {
  try {
    const snapshot = await playersCollection.get();
    const players = [];
    
    snapshot.forEach(doc => {
      players.push({ id: doc.id, ...doc.data() });
    });
    
    return players;
  } catch (error) {
    console.error("Error getting players: ", error);
    return [];
  }
}

// Record a guess to the database
async function recordGuess(guessData) {
  try {
    // Add timestamp
    guessData.timestamp = firebase.firestore.FieldValue.serverTimestamp();
    
    const docRef = await guessesCollection.add(guessData);
    return docRef.id;
  } catch (error) {
    console.error("Error recording guess: ", error);
    return null;
  }
}

// Update player stats after a game
async function updatePlayerStats(playerId, didLose) {
  try {
    const playerRef = playersCollection.doc(playerId);
    const playerDoc = await playerRef.get();
    
    if (playerDoc.exists) {
      const playerData = playerDoc.data();
      const updateData = {
        games_played: playerData.games_played + 1
      };
      
      if (didLose) {
        updateData.loss_count = playerData.loss_count + 1;
      } else {
        updateData.win_count = playerData.win_count + 1;
      }
      
      await playerRef.update(updateData);
      return true;
    } else {
      console.error("Player not found");
      return false;
    }
  } catch (error) {
    console.error("Error updating player stats: ", error);
    return false;
  }
}
