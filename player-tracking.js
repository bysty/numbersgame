document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const setupScreen = document.getElementById('setup-screen');
    const playerSelectionScreen = document.getElementById('player-selection-screen');
    const gameScreen = document.getElementById('game-screen');
    
    const numPlayersInput = document.getElementById('num-players');
    const startGameBtn = document.getElementById('start-game-btn');
    
    const playerPositionsContainer = document.getElementById('player-positions');
    const currentPositionSelect = document.getElementById('current-position');
    const playerSelect = document.getElementById('player-select');
    const newPlayerNameInput = document.getElementById('new-player-name');
    const addPlayerBtn = document.getElementById('add-player-btn');
    const assignPlayerBtn = document.getElementById('assign-player-btn');
    const assignedPlayersList = document.getElementById('assigned-players-list');
    const startGameWithPlayersBtn = document.getElementById('start-game-with-players-btn');
    const backToSetupBtn = document.getElementById('back-to-setup-btn');

    // State for player tracking
    let numPlayers = 2;
    let selectedPositionIndex = null;
    let playerAssignments = []; // Array of {position, player} objects
    let loadedPlayers = []; // Players loaded from Firestore
    let currentGameId = null; // Unique ID for the current game session

    // Initialize player selection
    const initializePlayerSelection = () => {
        numPlayers = parseInt(numPlayersInput.value);
        
        // Clear previous state
        playerPositionsContainer.innerHTML = '';
        currentPositionSelect.innerHTML = '';
        assignedPlayersList.innerHTML = '';
        playerAssignments = [];
        selectedPositionIndex = null;
        
        // Create position elements around the table
        createPositionElements();
        
        // Load players from Firestore
        loadPlayers();
        
        // Switch screens
        setupScreen.classList.remove('active');
        playerSelectionScreen.classList.add('active');
        
        // Generate a new game ID
        currentGameId = generateGameId();
    };

    // Create visual elements for player positions around the table
    const createPositionElements = () => {
        const tableCenter = { x: 140, y: 140 }; // Center of the table
        const radius = 110; // Distance from center
        
        for (let i = 0; i < numPlayers; i++) {
            // Calculate position around the circle
            const angle = (i * 2 * Math.PI / numPlayers) - Math.PI/2; // Start from top
            const x = tableCenter.x + radius * Math.cos(angle) - 25; // 25 is half of element width
            const y = tableCenter.y + radius * Math.sin(angle) - 25; // 25 is half of element height
            
            // Create position element
            const positionElem = document.createElement('div');
            positionElem.className = 'player-position';
            positionElem.dataset.position = i;
            positionElem.style.left = `${x}px`;
            positionElem.style.top = `${y}px`;
            
            // Add position number and placeholder
            const positionText = document.createElement('span');
            positionText.textContent = `P${i+1}`;
            positionElem.appendChild(positionText);
            
            // Add to container
            playerPositionsContainer.appendChild(positionElem);
            
            // Add to dropdown
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Player ${i+1}`;
            currentPositionSelect.appendChild(option);
            
            // Add to player assignments array with null player
            playerAssignments.push({ position: i, player: null });
            
            // Add click event to select this position
            positionElem.addEventListener('click', () => {
                selectPosition(i);
            });
        }
    };

    // Select a position to assign a player
    const selectPosition = (position) => {
        // Clear previous selection
        document.querySelectorAll('.player-position.selected').forEach(elem => {
            elem.classList.remove('selected');
        });
        
        // Update selected position
        selectedPositionIndex = position;
        
        // Highlight the selected position
        const positionElem = document.querySelector(`.player-position[data-position="${position}"]`);
        if (positionElem) {
            positionElem.classList.add('selected');
        }
        
        // Update dropdown
        currentPositionSelect.value = position;
    };

    // Load players from Firestore
    const loadPlayers = async () => {
        try {
            // Clear previous options, but keep the placeholder
            playerSelect.innerHTML = '<option value="">-- Select a player --</option>';
            
            // Get players from Firestore
            loadedPlayers = await getAllPlayers();
            
            // Add players to dropdown
            loadedPlayers.forEach(player => {
                const option = document.createElement('option');
                option.value = player.id;
                option.textContent = player.name;
                playerSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading players:', error);
            alert('Failed to load players. Check console for details.');
        }
    };

    // Add a new player to Firestore
    const addNewPlayer = async () => {
        const playerName = newPlayerNameInput.value.trim();
        
        if (!playerName) {
            alert('Please enter a player name.');
            return;
        }
        
        try {
            // Add player to Firestore
            const newPlayer = await addPlayer(playerName);
            
            if (newPlayer) {
                // Add to loaded players array
                loadedPlayers.push(newPlayer);
                
                // Add to dropdown
                const option = document.createElement('option');
                option.value = newPlayer.id;
                option.textContent = newPlayer.name;
                playerSelect.appendChild(option);
                
                // Select the new player
                playerSelect.value = newPlayer.id;
                
                // Clear input
                newPlayerNameInput.value = '';
            }
        } catch (error) {
            console.error('Error adding player:', error);
            alert('Failed to add player. Check console for details.');
        }
    };

    // Assign a player to a position
    const assignPlayerToPosition = () => {
        if (selectedPositionIndex === null) {
            alert('Please select a position first.');
            return;
        }
        
        const playerId = playerSelect.value;
        if (!playerId) {
            alert('Please select a player.');
            return;
        }
        
        // Find the player object
        const player = loadedPlayers.find(p => p.id === playerId);
        if (!player) {
            alert('Player not found.');
            return;
        }
        
        // Update assignment
        playerAssignments[selectedPositionIndex].player = player;
        
        // Update visual representation
        updatePlayerAssignmentDisplay();
        
        // Highlight assigned position
        const positionElem = document.querySelector(`.player-position[data-position="${selectedPositionIndex}"]`);
        if (positionElem) {
            positionElem.classList.remove('selected');
            positionElem.classList.add('assigned');
            
            // Update text to show player name
            const span = positionElem.querySelector('span');
            if (span) {
                span.textContent = player.name;
            }
        }
        
        // Check if all positions are assigned
        checkAllPositionsAssigned();
    };

    // Update the list of assigned players
    const updatePlayerAssignmentDisplay = () => {
        assignedPlayersList.innerHTML = '';
        
        playerAssignments.forEach((assignment, index) => {
            if (assignment.player) {
                const listItem = document.createElement('li');
                
                const positionSpan = document.createElement('span');
                positionSpan.textContent = `Position ${index + 1}: `;
                
                const nameSpan = document.createElement('strong');
                nameSpan.textContent = assignment.player.name;
                
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-player-btn';
                removeBtn.textContent = 'Remove';
                removeBtn.addEventListener('click', () => removePlayerAssignment(index));
                
                listItem.appendChild(positionSpan);
                listItem.appendChild(nameSpan);
                listItem.appendChild(removeBtn);
                
                assignedPlayersList.appendChild(listItem);
            }
        });
    };

    // Remove a player assignment
    const removePlayerAssignment = (position) => {
        // Clear assignment
        playerAssignments[position].player = null;
        
        // Update position element
        const positionElem = document.querySelector(`.player-position[data-position="${position}"]`);
        if (positionElem) {
            positionElem.classList.remove('assigned');
            
            // Reset text to show position number
            const span = positionElem.querySelector('span');
            if (span) {
                span.textContent = `P${position+1}`;
            }
        }
        
        // Update display
        updatePlayerAssignmentDisplay();
        
        // Update start button state
        checkAllPositionsAssigned();
    };

    // Check if all positions have been assigned players
    const checkAllPositionsAssigned = () => {
        const allAssigned = playerAssignments.every(assignment => assignment.player !== null);
        startGameWithPlayersBtn.disabled = !allAssigned;
    };

    // Generate a unique game ID
    const generateGameId = () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    };

    // Start the game with assigned players
    const startGameWithPlayers = () => {
        // Switch to game screen
        playerSelectionScreen.classList.remove('active');
        gameScreen.classList.add('active');
        
        // Initialize the game (from app.js)
        if (typeof initializeGame === 'function') {
            // Call the existing initializeGame function if it exists
            initializeGame();
        }
    };

    // Record a guess to Firestore
    window.recordPlayerGuess = (playerIndex, guess, result, contextData) => {
        // Only record if we have player assignments
        if (!playerAssignments.length || !playerAssignments[playerIndex] || !playerAssignments[playerIndex].player) {
            console.warn('Cannot record guess: No player assigned to position', playerIndex);
            return;
        }
        
        const player = playerAssignments[playerIndex].player;
        
        // Build the guess data object
        const guessData = {
            player_id: player.id,
            game_id: currentGameId,
            round_number: contextData.roundNumber || 1,
            turn_number_in_round: contextData.turnNumber || 1,
            current_low: contextData.currentLow,
            current_high: contextData.currentHigh,
            range_size: contextData.currentHigh - contextData.currentLow - 1,
            position_from_host: calculatePositionFromHost(playerIndex, contextData.hostPlayerIndex),
            players_count: numPlayers,
            is_forced_turn: contextData.isForcedTurn || false,
            previous_guesses_in_round: contextData.previousGuesses || [],
            guess_value: guess,
            result: result, // "higher", "lower", "correct"
            timestamp: new Date()
        };
        
        // Calculate normalized position within range (0-1)
        if (guessData.range_size > 0) {
            guessData.relative_position_in_range = (guess - contextData.currentLow) / (contextData.currentHigh - contextData.currentLow);
        }
        
        // Add decision time if available
        if (contextData.decisionStartTime) {
            guessData.decision_time_seconds = (new Date() - contextData.decisionStartTime) / 1000;
        }
        
        // Record to Firestore
        recordGuess(guessData).catch(error => {
            console.error('Error recording guess:', error);
        });
        
        // Return the guess data (may be useful for the caller)
        return guessData;
    };

    // Calculate position relative to host (0 = host, 1 = next player, etc.)
    const calculatePositionFromHost = (playerIndex, hostIndex) => {
        if (playerIndex === hostIndex) return 0;
        return ((playerIndex - hostIndex + numPlayers) % numPlayers);
    };

    // Update player stats at the end of a round
    window.updatePlayerStats = (playerIndex, didLose) => {
        if (!playerAssignments.length || !playerAssignments[playerIndex] || !playerAssignments[playerIndex].player) {
            console.warn('Cannot update stats: No player assigned to position', playerIndex);
            return;
        }
        
        const player = playerAssignments[playerIndex].player;
        
        // Update player stats in Firestore
        updatePlayerStats(player.id, didLose).catch(error => {
            console.error('Error updating player stats:', error);
        });
    };

    // Patch into existing game functions to track guesses
    // This will run after app.js has initialized its event listeners
    const patchGameFunctions = () => {
        // Original reference to the processHostFeedback function from app.js
        const originalProcessHostFeedback = window.processHostFeedback;
        
        // If the function exists, patch it to track guesses
        if (typeof originalProcessHostFeedback === 'function') {
            window.processHostFeedback = function(feedback) {
                // Get current game state before the original function changes it
                const contextData = {
                    currentLow: window.currentLow,
                    currentHigh: window.currentHigh,
                    hostPlayerIndex: window.hostPlayerIndex,
                    currentPlayerIndex: window.currentPlayerIndex,
                    isForcedTurn: window.currentPlayerIndex === window.hostPlayerIndex,
                    previousGuesses: window.guessHistory.map(h => h.guess)
                };
                
                // Get the current guess
                const guess = parseInt(document.getElementById('player-guess').value);
                
                // Call the original function
                const result = originalProcessHostFeedback.call(this, feedback);
                
                // Record the guess with the feedback result
                window.recordPlayerGuess(
                    contextData.currentPlayerIndex,
                    guess,
                    feedback, // "higher", "lower", "correct"
                    contextData
                );
                
                // If this was a correct guess (player loses), update their stats
                if (feedback === 'correct') {
                    window.updatePlayerStats(contextData.currentPlayerIndex, true);
                }
                
                return result;
            };
        }
    };

    // Event listeners
    startGameBtn.addEventListener('click', initializePlayerSelection);
    
    currentPositionSelect.addEventListener('change', (e) => {
        selectPosition(parseInt(e.target.value));
    });
    
    addPlayerBtn.addEventListener('click', addNewPlayer);
    
    assignPlayerBtn.addEventListener('click', assignPlayerToPosition);
    
    startGameWithPlayersBtn.addEventListener('click', startGameWithPlayers);
    
    backToSetupBtn.addEventListener('click', () => {
        playerSelectionScreen.classList.remove('active');
        setupScreen.classList.add('active');
    });

    // Initialize patches after a small delay to ensure app.js has loaded
    setTimeout(patchGameFunctions, 500);
});
