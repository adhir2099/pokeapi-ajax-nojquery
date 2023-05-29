const button = document.getElementById('button');
const img    = document.getElementById('img');
const text   = document.getElementById('info');
const url    = document.getElementById('pokeLogo');

url.setAttribute('src', 'assets/img/logo2.png');

img.style.display = 'none';

button.addEventListener('click',()=>{
    const inputSearch = document.getElementById('searchBox').value
    const request = new XMLHttpRequest()

    request.open('GET',`https://pokeapi.co/api/v2/pokemon/${inputSearch}`)

    request.onload = () => {
        if(request.status == 200){
            const datoPokemon = JSON.parse( request.responseText)
            img.style.display = '';
            img.src = `${datoPokemon.sprites.front_default}`;
            text.textContent = datoPokemon.name.toUpperCase();
        } else {
            alert('There was an error with the request')
        }
    };

    request.onerror = () => {
        alert('There was a network error')
    };

    request.send();
})