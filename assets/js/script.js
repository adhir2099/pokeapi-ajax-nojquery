const POKEMON_API_URL = 'https://pokeapi.co/api/v2/pokemon/';
const MIN_POKEMON_ID = 1;
const MAX_POKEMON_ID = 1025;

const elements = {
    form: document.getElementById('searchForm'),
    image: document.getElementById('img'),
    logo: document.getElementById('pokeLogo'),
    name: document.getElementById('info'),
    searchBox: document.getElementById('searchBox'),
};

let latestRequest = 0;

elements.logo.src = 'assets/img/logo2.png';
hidePokemon();

function showAlert(title, icon) {
    Swal.fire(title, '', icon);
}

function hidePokemon() {
    elements.image.style.display = 'none';
    elements.name.textContent = '';
}

function validatePokemonId(value) {
    const pokemonId = Number(value);

    if (!Number.isInteger(pokemonId) || pokemonId < MIN_POKEMON_ID || pokemonId > MAX_POKEMON_ID) {
        showAlert(`Choose between ${MIN_POKEMON_ID} and ${MAX_POKEMON_ID}`, 'warning');
        elements.searchBox.value = '';
        return null;
    }

    return pokemonId;
}

function getPokemonImage(sprites) {
    return sprites?.front_default
        ?? sprites?.other?.['official-artwork']?.front_default;
}

function showPokemon(pokemon, requestId) {
    const imageUrl = getPokemonImage(pokemon.sprites);

    if (!pokemon.name || !imageUrl) {
        hidePokemon();
        showAlert('Pokémon details are unavailable', 'error');
        return;
    }

    const artwork = new Image();

    artwork.addEventListener('load', () => {
        if (requestId !== latestRequest) {
            return;
        }

        elements.image.src = imageUrl;
        elements.image.alt = `${pokemon.name} artwork`;
        elements.image.style.display = '';
        elements.name.textContent = pokemon.name.toUpperCase();
    });

    artwork.addEventListener('error', () => {
        if (requestId === latestRequest) {
            hidePokemon();
            showAlert('Pokémon artwork is unavailable', 'error');
        }
    });

    artwork.src = imageUrl;
}

async function fetchPokemon(pokemonId, requestId) {
    try {
        const response = await fetch(`${POKEMON_API_URL}${pokemonId}`);

        if (!response.ok) {
            if (requestId === latestRequest) {
                hidePokemon();
                showAlert('No Pokémon found', 'error');
            }
            return;
        }

        const pokemon = await response.json();

        if (requestId === latestRequest) {
            showPokemon(pokemon, requestId);
        }
    } catch {
        if (requestId === latestRequest) {
            hidePokemon();
            showAlert('There was a network error', 'error');
        }
    }
}

elements.form.addEventListener('submit', (event) => {
    event.preventDefault();

    latestRequest += 1;
    const requestId = latestRequest;
    const pokemonId = validatePokemonId(elements.searchBox.value);
    if (pokemonId === null) {
        hidePokemon();
        return;
    }

    fetchPokemon(pokemonId, requestId);
});
