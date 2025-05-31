document.addEventListener('DOMContentLoaded', () => {
    // Screens
    const setupScreen = document.getElementById('setup-screen');
    const gameScreen = document.getElementById('game-screen');

    // Setup Screen Elements
    const numPlayersInput = document.getElementById('num-players');
    const startGameBtn = document.getElementById('start-game-btn');

    // Game Screen Elements
    const currentPlayerDisplay = document.getElementById('current-player-display');
    const hostPlayerDisplay = document.getElementById('host-player-display');
    const currentLowDisplay = document.getElementById('current-low-display');
    const currentHighDisplay = document.getElementById('current-high-display');
    const optimalGuessDisplay = document.getElementById('optimal-guess-display');
    
    const playerGuessInput = document.getElementById('player-guess');
    const keypadButtons = document.querySelectorAll('#keypad .key');
    const submitGuessBtn = document.getElementById('submit-guess-btn');

    const hostFeedbackSection = document.getElementById('host-feedback-section');
    const submittedGuessValueDisplay = document.getElementById('submitted-guess-value');
    const feedbackLowerBtn = document.getElementById('feedback-lower-btn');
    const feedbackHigherBtn = document.getElementById('feedback-higher-btn');
    const feedbackCorrectBtn = document.getElementById('feedback-correct-btn');

    const guessHistoryList = document.getElementById('guess-history-list');
    const newRoundBtn = document.getElementById('new-round-btn');
    const resetGameBtn = document.getElementById('reset-game-btn');

    // Game State
    let numPlayers = 2;
    let currentPlayerIndex = 0; // Player 1 is 0, Player 2 is 1, etc.
    let hostPlayerIndex = 0; 
    let currentLow = 1;
    let currentHigh = 100;
    let actualSecretNumber = null; // Only known by the host in a real game, for simulation/dev can be set
    let guessHistory = []; // Stores {player, guess, newLow, newHigh, wasCorrect}
    let validRangeNumbers = []; // Numbers that formed previous ranges, cannot be guessed.

    // --- SETUP ---
    startGameBtn.addEventListener('click', () => {
        numPlayers = parseInt(numPlayersInput.value);
        if (numPlayers >= 2 && numPlayers <= 10) {
            initializeGame();
            setupScreen.classList.remove('active');
            gameScreen.classList.add('active');
        } else {
            alert("Please enter a number of players between 2 and 10.");
        }
    });

    resetGameBtn.addEventListener('click', () => {
        gameScreen.classList.remove('active');
        setupScreen.classList.add('active');
        // Full reset of state needed here if re-initializing
        numPlayersInput.value = "2";
        playerGuessInput.value = "";
    });

    // --- INITIALIZATION ---
    function initializeGame() {
        currentPlayerIndex = 0; // Player 1 starts
        hostPlayerIndex = 0;    // Player 1 is the first host
        currentLow = 1;
        currentHigh = 100;
        guessHistory = [];
        validRangeNumbers = [1, 100]; // Initial range boundaries
        playerGuessInput.value = "";
        hostFeedbackSection.classList.add('hidden');
        submitGuessBtn.classList.remove('hidden');
        newRoundBtn.classList.add('hidden');
        updateGameDisplay();
        calculateAndDisplayOptimalGuess();
    }

    // --- KEYPAD LOGIC ---
    keypadButtons.forEach(button => {
        button.addEventListener('click', () => {
            const value = button.textContent;
            if (button.classList.contains('clear')) {
                playerGuessInput.value = "";
            } else if (button.classList.contains('enter')) {
                submitGuessBtn.click(); // Trigger submit
            } else {
                if (playerGuessInput.value.length < 3) { // Max 3 digits for 1-100
                    playerGuessInput.value += value;
                }
            }
        });
    });

    // --- GUESS SUBMISSION ---
    submitGuessBtn.addEventListener('click', () => {
        const guess = parseInt(playerGuessInput.value);

        if (isNaN(guess) || guess < currentLow || guess > currentHigh) {
            alert(`Invalid guess. Please enter a number between ${currentLow} and ${currentHigh}.`);
            return;
        }
        if (guess === currentLow || guess === currentHigh) {
             alert(`You cannot guess ${guess} as it's part of the current range boundary.`);
             return;
        }
        if (guessHistory.some(item => item.guess === guess) || validRangeNumbers.includes(guess)) {
            alert("This number has already been guessed or used as a range boundary. Try another.");
            return;
        }

        submittedGuessValueDisplay.textContent = guess;
        hostFeedbackSection.classList.remove('hidden');
        submitGuessBtn.classList.add('hidden'); // Hide submit until feedback
    });

    // --- HOST FEEDBACK HANDLING ---
    feedbackLowerBtn.addEventListener('click', () => processHostFeedback('lower'));
    feedbackHigherBtn.addEventListener('click', () => processHostFeedback('higher'));
    feedbackCorrectBtn.addEventListener('click', () => processHostFeedback('correct'));

    function processHostFeedback(feedback) {
        const guess = parseInt(playerGuessInput.value);
        let wasCorrect = false;

        const historyEntry = {
            player: currentPlayerIndex + 1,
            guess: guess,
            previousLow: currentLow,
            previousHigh: currentHigh,
        };

        if (feedback === 'lower') { // Secret number is lower than the guess
            currentHigh = guess;
            validRangeNumbers.push(guess);
        } else if (feedback === 'higher') { // Secret number is higher than the guess
            currentLow = guess;
            validRangeNumbers.push(guess);
        } else if (feedback === 'correct') {
            wasCorrect = true;
            // Player loses, game round ends
            alert(`Player ${currentPlayerIndex + 1} guessed the number ${guess} and loses this round!`);
            // Potentially add $10 to pot, etc. (not implemented in UI)
            newRoundBtn.classList.remove('hidden');
        }
        
        historyEntry.newLow = currentLow;
        historyEntry.newHigh = currentHigh;
        historyEntry.wasCorrect = wasCorrect;
        guessHistory.push(historyEntry);

        playerGuessInput.value = ""; // Clear input for next guess
        hostFeedbackSection.classList.add('hidden');
        
        if (!wasCorrect) {
            submitGuessBtn.classList.remove('hidden');
            advanceToNextPlayer();
            calculateAndDisplayOptimalGuess();
        }
        updateGameDisplay();
    }

    // --- NEW ROUND ---
    newRoundBtn.addEventListener('click', () => {
        // The loser becomes the new host
        hostPlayerIndex = currentPlayerIndex; 
        // Player to the left of the new host starts
        currentPlayerIndex = (hostPlayerIndex + 1) % numPlayers; 
        
        currentLow = 1;
        currentHigh = 100;
        guessHistory = []; // Clear history for the new round
        validRangeNumbers = [1, 100];
        
        newRoundBtn.classList.add('hidden');
        submitGuessBtn.classList.remove('hidden');
        updateGameDisplay();
        calculateAndDisplayOptimalGuess();
    });

    // --- GAME LOGIC & UPDATES ---
    function advanceToNextPlayer() {
        currentPlayerIndex = (currentPlayerIndex + 1) % numPlayers;
        // Skip host if it's their turn to guess (they know the number)
        if (currentPlayerIndex === hostPlayerIndex) {
            currentPlayerIndex = (currentPlayerIndex + 1) % numPlayers;
        }
    }

    function updateGameDisplay() {
        currentPlayerDisplay.textContent = `Player ${currentPlayerIndex + 1}`;
        currentPlayerDisplay.classList.toggle('highlight', true); // Always highlight current player
        hostPlayerDisplay.textContent = `Player ${hostPlayerIndex + 1}`;
        currentLowDisplay.textContent = currentLow;
        currentHighDisplay.textContent = currentHigh;

        // Update guess history display
        guessHistoryList.innerHTML = ""; // Clear previous history
        [...guessHistory].reverse().forEach(item => {
            const listItem = document.createElement('li');
            let text = `P${item.player} guessed ${item.guess}. `;
            if (item.wasCorrect) {
                text += `Correct! P${item.player} loses.`;
            } else {
                text += `Range: ${item.newLow}-${item.newHigh}.`;
            }
            listItem.textContent = text;
            guessHistoryList.appendChild(listItem);
        });
    }

    function calculateAndDisplayOptimalGuess() {
        // Placeholder for "Optimal Guess for You"
        // This is where the core mathematical strategy will go.
        // For now, let's suggest a simple mid-point or a safe guess.

        const guessableSlots = currentHigh - currentLow - 1;
        let optimalGuess = "";

        if (guessableSlots <= 0) {
            optimalGuess = "No valid guesses!";
        } else if (guessableSlots === 1) {
            optimalGuess = `Forced to guess ${currentLow + 1}`;
        } else {
            // Try to find a "trap" guess
            // Target player is "opposite": (currentPlayerIndex + numPlayers/2) % numPlayers
            // For simplicity, let's assume we want to trap the *next* player (k=1)
            // This means leaving 0 slots for them, which is not the game's goal.
            // The goal is to leave *them* with 1 slot.
            // So, if it's my turn (P0), and next is P1 (k=1 turn away), I want to make a guess G
            // such that if G is not the number, the new range for P1 has 1 slot.
            // This means the range I create for P1 must have U-L-1 = 1, so U-L = 2.
            // Example: Range [10,13] -> P1 must guess 11. (L=10, U=12, not 13)
            
            // Let k be the number of turns until the target player.
            // For "opposite" player:
            let targetPlayerRelativeIndex;
            if (numPlayers % 2 === 0) { // Even number of players
                targetPlayerRelativeIndex = numPlayers / 2;
            } else { // Odd number of players
                targetPlayerRelativeIndex = Math.floor(numPlayers / 2); 
                // Could also be Math.ceil, or user selectable "left opposite" / "right opposite"
            }
            
            // k = number of players between current and target (exclusive of current, inclusive of target if counting turns)
            // Or, more simply, how many players will guess before the target.
            let turnsToTarget = 0;
            let tempPlayer = currentPlayerIndex;
            let targetPlayerActualIndex = (currentPlayerIndex + targetPlayerRelativeIndex) % numPlayers;

            // Adjust if target is host
            if (targetPlayerActualIndex === hostPlayerIndex) {
                 targetPlayerActualIndex = (targetPlayerActualIndex + 1) % numPlayers; // Aim for player after host
                 // Recalculate relative index if this changes significantly
            }


            let p = tempPlayer;
            while(true) {
                p = (p + 1) % numPlayers;
                if (p === hostPlayerIndex) continue; // Skip host
                turnsToTarget++;
                if (p === targetPlayerActualIndex) break;
                if (turnsToTarget > numPlayers) { // Safety break
                    turnsToTarget = 1; // Default to next player if complex
                    break;
                }
            }
            
            const k = turnsToTarget; // Number of guesses before target player's turn

            // We want to leave k-1 slots for intermediate players.
            // So the target player is left with 1 slot.
            // The range for the target player should be [X, X+2] (e.g. [10,12] so they guess 11)
            // This means the segment we create for them has 1 guessable slot.
            // The total number of slots we need to "consume" with our guess + intermediate players is k.
            // (1 for our guess, k-1 for intermediate players)

            let G_trap1 = currentLow + k + 1; // Guessing G_trap1 leaves [currentLow, G_trap1-1]
                                            // Slots in that range: (G_trap1-1) - currentLow - 1 = k-1
            let G_trap2 = currentHigh - k - 1; // Guessing G_trap2 leaves [G_trap2+1, currentHigh]
                                             // Slots in that range: currentHigh - (G_trap2+1) - 1 = k-1
            
            let candidateGuesses = [];
            if (G_trap1 > currentLow && G_trap1 < currentHigh && !guessHistory.some(h => h.guess === G_trap1) && !validRangeNumbers.includes(G_trap1)) {
                candidateGuesses.push(G_trap1);
            }
            if (G_trap2 > currentLow && G_trap2 < currentHigh && !guessHistory.some(h => h.guess === G_trap2) && !validRangeNumbers.includes(G_trap2) && G_trap2 !== G_trap1) {
                candidateGuesses.push(G_trap2);
            }

            if (candidateGuesses.length > 0) {
                // Prefer the guess that makes the *other* segment larger (less likely to contain the secret number)
                if (candidateGuesses.length === 2) {
                    // If G_trap1 is chosen, other segment is [G_trap1+1, currentHigh]
                    // If G_trap2 is chosen, other segment is [currentLow, G_trap2-1]
                    let slots_other1 = currentHigh - (G_trap1 + 1) - 1;
                    let slots_other2 = (G_trap2 - 1) - currentLow - 1;
                    optimalGuess = slots_other1 >= slots_other2 ? G_trap1 : G_trap2;
                } else {
                    optimalGuess = candidateGuesses[0];
                }
                optimalGuess = `Try to trap Player ${targetPlayerActualIndex + 1} with: ${optimalGuess}`;
            } else {
                // Fallback: simple bisection, avoiding known bad numbers
                let mid = Math.round((currentLow + currentHigh) / 2);
                if (mid <= currentLow) mid = currentLow + 1;
                if (mid >= currentHigh) mid = currentHigh - 1;

                while ((guessHistory.some(h => h.guess === mid) || validRangeNumbers.includes(mid) || mid <= currentLow || mid >= currentHigh) && mid < currentHigh -1 ) {
                    mid++; // Try next if mid is bad, up to a point
                }
                 if ((guessHistory.some(h => h.guess === mid) || validRangeNumbers.includes(mid) || mid <= currentLow || mid >= currentHigh)) {
                    // If still bad, try going down
                    mid = Math.round((currentLow + currentHigh) / 2) -1;
                     while ((guessHistory.some(h => h.guess === mid) || validRangeNumbers.includes(mid) || mid <= currentLow || mid >= currentHigh) && mid > currentLow + 1 ) {
                        mid--; 
                    }
                 }


                if (mid > currentLow && mid < currentHigh && !guessHistory.some(h => h.guess === mid) && !validRangeNumbers.includes(mid)) {
                    optimalGuess = `Safe guess: ${mid}`;
                } else {
                    // Try first or last valid slot if midpoint is bad
                    let firstValid = currentLow + 1;
                    while((guessHistory.some(h => h.guess === firstValid) || validRangeNumbers.includes(firstValid)) && firstValid < currentHigh -1) firstValid++;
                    
                    let lastValid = currentHigh - 1;
                    while((guessHistory.some(h => h.guess === lastValid) || validRangeNumbers.includes(lastValid)) && lastValid > currentLow + 1) lastValid--;

                    if (firstValid < currentHigh -1 && !guessHistory.some(h => h.guess === firstValid) && !validRangeNumbers.includes(firstValid)) {
                         optimalGuess = `Safe guess: ${firstValid}`;
                    } else if (lastValid > currentLow + 1 && !guessHistory.some(h => h.guess === lastValid) && !validRangeNumbers.includes(lastValid)) {
                         optimalGuess = `Safe guess: ${lastValid}`;
                    } else {
                        optimalGuess = "Complex situation. Choose carefully!";
                    }
                }
            }
        }
        optimalGuessDisplay.innerHTML = optimalGuess; // Use innerHTML for strong tags if needed
    }

    // Initial call if needed (e.g. if game starts automatically without setup screen for dev)
    // initializeGame(); 
});
