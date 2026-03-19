document.getElementById('summon-btn').addEventListener('click', () => {
    const player1 = document.getElementById('player1').value.trim();
    const player2 = document.getElementById('player2').value.trim();

    if (!player1 || !player2) {
        alert("The ritual requires two names.");
        return;
    }

    console.log(`Summoning ritual initiated for: ${player1} and ${player2}`);
});
