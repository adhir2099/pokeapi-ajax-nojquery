const button = document.getElementById('button');
const img    = document.getElementById('img');
const text   = document.getElementById('info');
const url    = document.getElementById('pokeLogo');

url.setAttribute('src', 'assets/img/logo2.png');

img.style.display = 'none';

button.addEventListener('click',()=>{
    const inputSearch = document.getElementById('searchBox').value
    const request = new XMLHttpRequest()

    document.getElementById('searchBox').addEventListener('input', function() {
        let inputValue = parseInt(this.value);
    
        if (isNaN(inputValue) || inputValue < 1 || inputValue > 1017) {
            Swal.fire("Choose between 1 and 1017","","warning");
            this.value = '';
        }
    });

    request.open('GET',`https://pokeapi.co/api/v2/pokemon/${inputSearch}`)

    request.onload = () => {
        if(request.status == 200){
            const datoPokemon = JSON.parse( request.responseText)
            img.style.display = '';
            img.src = `${datoPokemon.sprites.front_default}`;
            text.textContent = datoPokemon.name.toUpperCase();
        } else {
            Swal.fire("Choose between 1 and 1017","","warning");
        }
    };

    request.onerror = () => {
        Swal.fire("There was a network error","","error");
    };

    request.send();
})