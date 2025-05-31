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
    const roundResultMessage = document.getElementById('round-result-message');
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
    let playersWhoHaveGuessedThisSubRound = new Set(); // Players who made a guess since last range update

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
        numPlayersInput.value = "2"; // Default back
        playerGuessInput.value = "";
        hostPlayerIndex = 0; // Reset host to Player 1
        // currentPlayerIndex will be set by initializeGame if we call it
        // or we can set it here: currentPlayerIndex = (hostPlayerIndex + 1) % (numPlayers || 2);
        playersWhoHaveGuessedThisSubRound.clear();
        // Consider calling initializeGame() or a more specific reset function
        // For now, just ensure critical state is reset for when setup screen leads to initializeGame
    });

    // --- INITIALIZATION ---
    function initializeGame() {
        hostPlayerIndex = 0;    // Player 1 is the first host
        currentPlayerIndex = (hostPlayerIndex + 1) % numPlayers; // Player to the left of host starts
        currentLow = 1;
        currentHigh = 100;
        guessHistory = [];
        validRangeNumbers = [1, 100]; // Initial range boundaries
        playersWhoHaveGuessedThisSubRound.clear();
        playerGuessInput.value = "";
        hostFeedbackSection.classList.add('hidden');
        roundResultMessage.classList.add('hidden'); // Hide result message
        roundResultMessage.textContent = "";
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
            playersWhoHaveGuessedThisSubRound.clear(); // Range changed, reset who has guessed
        } else if (feedback === 'higher') { // Secret number is higher than the guess
            currentLow = guess;
            validRangeNumbers.push(guess);
            playersWhoHaveGuessedThisSubRound.clear(); // Range changed, reset who has guessed
        } else if (feedback === 'correct') {
            wasCorrect = true;
            // Player loses, game round ends
            roundResultMessage.textContent = `Player ${currentPlayerIndex + 1} guessed ${guess} and loses this round!`;
            roundResultMessage.classList.remove('hidden');
            // Potentially add $10 to pot, etc. (not implemented in UI)
            newRoundBtn.classList.remove('hidden');
            submitGuessBtn.classList.add('hidden'); // Hide submit button as round is over
        }
        
        historyEntry.newLow = currentLow;
        historyEntry.newHigh = currentHigh;
        historyEntry.wasCorrect = wasCorrect;
        guessHistory.push(historyEntry);

        playerGuessInput.value = ""; // Clear input for next guess
        hostFeedbackSection.classList.add('hidden');
        
        if (!wasCorrect) {
            if (currentPlayerIndex !== hostPlayerIndex) { // Don't add host to this list
                playersWhoHaveGuessedThisSubRound.add(currentPlayerIndex);
            }
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
        playersWhoHaveGuessedThisSubRound.clear();
        
        roundResultMessage.classList.add('hidden'); // Hide for new round
        roundResultMessage.textContent = "";
        newRoundBtn.classList.add('hidden');
        submitGuessBtn.classList.remove('hidden');
        updateGameDisplay();
        calculateAndDisplayOptimalGuess();
    });

    // --- GAME LOGIC & UPDATES ---
    function advanceToNextPlayer() {
        // Handle edge case of single player
        if (numPlayers <= 1) {
            currentPlayerIndex = hostPlayerIndex;
            return;
        }
        
        // Get next player in sequence
        let nextPlayer = (currentPlayerIndex + 1) % numPlayers;
        
        // Check if next player would be the Host
        if (nextPlayer === hostPlayerIndex) {
            // Count non-host players who have guessed in this sub-round
            let nonHostPlayers = 0;
            let nonHostPlayersWhoGuessed = 0;
            
            // Loop through all player indices
            for (let i = 0; i < numPlayers; i++) {
                if (i !== hostPlayerIndex) {
                    nonHostPlayers++;
                    if (playersWhoHaveGuessedThisSubRound.has(i)) {
                        nonHostPlayersWhoGuessed++;
                    }
                }
            }
            
            // If all non-host players have guessed, it's Host's forced turn
            if (nonHostPlayersWhoGuessed >= nonHostPlayers) {
                currentPlayerIndex = hostPlayerIndex;
            } else {
                // Skip host and go to next player
                currentPlayerIndex = (hostPlayerIndex + 1) % numPlayers;
            }
        } else {
            // Standard case - next player is not the host
            currentPlayerIndex = nextPlayer;
        }
    }

    function updateGameDisplay() {
        let playerTurnText = `Player ${currentPlayerIndex + 1}`;
        
        // Check if it's the host's forced turn
        if (currentPlayerIndex === hostPlayerIndex) {
            // Count non-host players who have guessed
            let nonHostPlayers = 0;
            let nonHostPlayersWhoGuessed = 0;
            
            for (let i = 0; i < numPlayers; i++) {
                if (i !== hostPlayerIndex) {
                    nonHostPlayers++;
                    if (playersWhoHaveGuessedThisSubRound.has(i)) {
                        nonHostPlayersWhoGuessed++;
                    }
                }
            }
            
            // If all non-host players have guessed, it's a forced turn
            if (nonHostPlayersWhoGuessed >= nonHostPlayers && numPlayers > 1) {
                playerTurnText += " (Host's Forced Guess)";
            }
        }
        
        currentPlayerDisplay.textContent = playerTurnText;
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

        // Check if it's the host's forced turn
        if (currentPlayerIndex === hostPlayerIndex) {
            // Count non-host players who have guessed
            let nonHostPlayers = 0;
            let nonHostPlayersWhoGuessed = 0;
            
            for (let i = 0; i < numPlayers; i++) {
                if (i !== hostPlayerIndex) {
                    nonHostPlayers++;
                    if (playersWhoHaveGuessedThisSubRound.has(i)) {
                        nonHostPlayersWhoGuessed++;
                    }
                }
            }
            
            // If all non-host players have guessed, it's a forced turn
            if (nonHostPlayersWhoGuessed >= nonHostPlayers && numPlayers > 1) {
                optimalGuessDisplay.innerHTML = "<strong>Host's Forced Guess:</strong> Choose the closest available number to your secret number.";
                return; // Don't calculate optimal guess for host in this scenario
            }
        }

        const guessableSlots = currentHigh - currentLow - 1;
        let optimalGuess = "";

        if (guessableSlots <= 0) {
            optimalGuess = "No valid guesses!";
        } else if (guessableSlots === 1) {
            optimalGuess = `Forced to guess ${currentLow + 1}`;
        } else {
            // Try to find a "trap" guess
            // The strategy is to make a guess that leaves exactly 1 slot for a target player
            // This forces them into a situation where they have only one possible guess
            
            // Simplified target player calculation - "opposite" player
            // Find player roughly half-way around the circle from current player
            let targetPlayerIndex = (currentPlayerIndex + Math.floor(numPlayers / 2)) % numPlayers;
            
            // Adjust if target is host - we'll target the next player after host
            if (targetPlayerIndex === hostPlayerIndex) {
                targetPlayerIndex = (targetPlayerIndex + 1) % numPlayers;
            }
            
            // Simplified calculation of turns to target player
            // This avoids the complex loop that tried to account for host skipping
            // Instead, we'll estimate based on player positions and adjust if needed
            
            let k; // Number of guesses before target player's turn
            
            // Calculate distance between current player and target
            if (targetPlayerIndex > currentPlayerIndex) {
                k = targetPlayerIndex - currentPlayerIndex;
            } else {
                k = numPlayers + targetPlayerIndex - currentPlayerIndex;
            }
            
            // Adjust for host skipping - if host is between current and target
            // and it's not host's forced turn, the host gets skipped
            let isHostBetween = false;
            let nonHostPlayersWhoGuessed = 0;
            let nonHostPlayers = 0;
            
            // Count players who have guessed
            for (let i = 0; i < numPlayers; i++) {
                if (i !== hostPlayerIndex) {
                    nonHostPlayers++;
                    if (playersWhoHaveGuessedThisSubRound.has(i)) {
                        nonHostPlayersWhoGuessed++;
                    }
                }
            }
            
            // Check if host is between current player and target
            if (hostPlayerIndex > currentPlayerIndex && hostPlayerIndex < targetPlayerIndex) {
                isHostBetween = true;
            } else if (currentPlayerIndex > targetPlayerIndex && 
                     (hostPlayerIndex > currentPlayerIndex || hostPlayerIndex < targetPlayerIndex)) {
                isHostBetween = true;
            }
            
            // If host is between and it's not their forced turn, reduce k by 1
            if (isHostBetween && nonHostPlayersWhoGuessed < nonHostPlayers) {
                k--;
            }
            
            // Safety checks
            if (k <= 0) k = 1;
            if (k > numPlayers - 1) k = numPlayers - 1;

            // Calculate trap guesses
            // We want to make a guess that leaves exactly k-1 slots for intermediate players
            // This ensures target player is left with exactly 1 choice
            
            // Trap Guess 1: if number is LOWER than our guess
            // This creates range [currentLow, G_trap1-1] with k-1 slots
            // Meaning: (G_trap1-1) - currentLow - 1 = k-1
            // Solving for G_trap1: G_trap1 = currentLow + k + 1
            let G_trap1 = currentLow + k + 1;
            
            // Trap Guess 2: if number is HIGHER than our guess
            // This creates range [G_trap2+1, currentHigh] with k-1 slots
            // Meaning: currentHigh - (G_trap2+1) - 1 = k-1
            // Solving for G_trap2: G_trap2 = currentHigh - k - 1
            let G_trap2 = currentHigh - k - 1;
            
            // Helper function to check if a number is a valid guess
            function isValidGuess(num) {
                return num > currentLow && 
                       num < currentHigh && 
                       !guessHistory.some(h => h.guess === num) && 
                       !validRangeNumbers.includes(num);
            }
            
            // Find valid trap guesses
            let candidateGuesses = [];
            if (isValidGuess(G_trap1)) {
                candidateGuesses.push(G_trap1);
            }
            if (isValidGuess(G_trap2) && G_trap2 !== G_trap1) {
                candidateGuesses.push(G_trap2);
            }

            if (candidateGuesses.length > 0) {
                // If we have multiple trap options, prefer the one that makes the other segment larger
                // This reduces the chance that the secret number is in our trap segment
                if (candidateGuesses.length === 2) {
                    // Calculate slots in complementary segments
                    let slots_other1 = currentHigh - (G_trap1 + 1) - 1; // Slots if G_trap1 is chosen
                    let slots_other2 = (G_trap2 - 1) - currentLow - 1;  // Slots if G_trap2 is chosen
                    // Choose the guess that creates larger complementary segment
                    optimalGuess = slots_other1 >= slots_other2 ? G_trap1 : G_trap2;
                } else {
                    optimalGuess = candidateGuesses[0];
                }
                optimalGuess = `Try to trap Player ${targetPlayerIndex + 1} with: ${optimalGuess}`;
            } else {
                // Fallback: Find a safe guess if no trap is possible
                
                // First try bisection (middle of range)
                let mid = Math.floor((currentLow + currentHigh) / 2);
                
                // Helper function to find next valid guess starting from a position
                function findNextValidGuess(start, increment, limit) {
                    let guess = start;
                    while (!isValidGuess(guess) && 
                          ((increment > 0 && guess < limit - 1) || 
                           (increment < 0 && guess > limit + 1))) {
                        guess += increment;
                    }
                    return isValidGuess(guess) ? guess : null;
                }
                
                // Try to find valid guesses using different strategies
                let validGuess = findNextValidGuess(mid, 0, 0); // Check midpoint first
                
                if (!validGuess) {
                    // Try searching up from midpoint
                    validGuess = findNextValidGuess(mid, 1, currentHigh);
                }
                
                if (!validGuess) {
                    // Try searching down from midpoint
                    validGuess = findNextValidGuess(mid, -1, currentLow);
                }
                
                if (!validGuess) {
                    // Last resort: try from bottom and top of range
                    validGuess = findNextValidGuess(currentLow + 1, 1, currentHigh);
                    
                    if (!validGuess) {
                        validGuess = findNextValidGuess(currentHigh - 1, -1, currentLow);
                    }
                }
                
                if (validGuess) {
                    optimalGuess = `Safe guess: ${validGuess}`;
                } else {
                    optimalGuess = "Complex situation. Choose carefully!";
                }
            }
        }
        optimalGuessDisplay.innerHTML = optimalGuess; // Use innerHTML for strong tags if needed
    }

    // Initial call if needed (e.g. if game starts automatically without setup screen for dev)
    // initializeGame(); 
});
