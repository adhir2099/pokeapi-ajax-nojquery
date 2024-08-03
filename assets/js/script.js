const button = document.getElementById('button');
const img = document.getElementById('img');
const text = document.getElementById('info');
const url = document.getElementById('pokeLogo');
const searchBox = document.getElementById('searchBox');

url.setAttribute('src', 'assets/img/logo2.png');
img.style.display = 'none';

// Function to validate input value
function validateInput(inputValue) {
    const number = parseInt(inputValue);
    if (isNaN(number) || number < 1 || number > 1025) {
        Swal.fire("Choose between 1 and 1025", "", "warning");
        searchBox.value = '';
        return false;
    }
    return true;
}

// Function to fetch Pokémon data
async function fetchPokemonData(pokemonId) {
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
        if (!response.ok) {
            Swal.fire("No response found", "", "error");
        }
        const data = await response.json();
        img.style.display = '';
        img.src = data.sprites.front_default;
        text.textContent = data.name.toUpperCase();
    } catch (error) {
        Swal.fire("There was a network error", "", "error");
    }
}

// Event Listener for button click
button.addEventListener('click', () => {
    const inputSearch = searchBox.value;
    if (validateInput(inputSearch)) {
        fetchPokemonData(inputSearch);
    }
});

// Event Listener for input validation
searchBox.addEventListener('input', () => {
    validateInput(searchBox.value);
});