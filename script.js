const API_KEY = "YOUR_API_KEY";
const API_URL = "https://www.omdbapi.com/";

const movieInput = document.getElementById("movieInput");
const searchBtn = document.getElementById("searchBtn");
const suggestions = document.getElementById("suggestions");
const message = document.getElementById("message");

const moviePoster = document.getElementById("moviePoster");
const movieTitle = document.getElementById("movieTitle");
const movieGenre = document.getElementById("movieGenre");
const movieRating = document.getElementById("movieRating");
const movieYear = document.getElementById("movieYear");
const moviePlot = document.getElementById("moviePlot");

const movieDirector = document.getElementById("movieDirector");
const movieGenreDetails = document.getElementById("movieGenreDetails");
const movieActors = document.getElementById("movieActors");
const movieLanguage = document.getElementById("movieLanguage");

const ratingValue = document.getElementById("ratingValue");
const ratingYear = document.getElementById("ratingYear");
const movieRuntime = document.getElementById("movieRuntime");
const movieReleased = document.getElementById("movieReleased");

const watchBtn = document.getElementById("watchBtn");

const recommendationGrid =
    document.getElementById("recommendationGrid");

const watchlistGrid =
    document.getElementById("watchlistGrid");

const clearWatchlist =
    document.getElementById("clearWatchlist");

const watchlistNav =
    document.getElementById("watchlistNav");

const movieModal =
    document.getElementById("movieModal");

const closeModal =
    document.getElementById("closeModal");

const modalTitle =
    document.getElementById("modalTitle");

const modalPoster =
    document.getElementById("modalPoster");

const modalPlot =
    document.getElementById("modalPlot");

const modalGenre =
    document.getElementById("modalGenre");

const modalDirector =
    document.getElementById("modalDirector");

const modalActors =
    document.getElementById("modalActors");

const modalRating =
    document.getElementById("modalRating");


let currentMovie = null;

let watchlist =
    JSON.parse(localStorage.getItem("cinenovaWatchlist")) || [];


/* -----------------------------
   SEARCH MOVIE
----------------------------- */

async function searchMovie(title) {

    if (!title.trim()) {
        showMessage("Please enter a movie name.");
        return;
    }

    showMessage("Searching...");
    suggestions.innerHTML = "";

    try {

        const response = await fetch(
            `${API_URL}?apikey=${API_KEY}&t=${encodeURIComponent(title)}&plot=full`
        );

        const data = await response.json();

        if (data.Response === "False") {
            showMessage("Movie not found. Try another name.");
            return;
        }

        showMessage("");

        displayMovie(data);

        loadRecommendations(data.Genre);

    } catch (error) {

        console.error(error);

        showMessage(
            "Something went wrong. Check your API key or internet connection."
        );
    }
}


/* -----------------------------
   DISPLAY MOVIE
----------------------------- */

function displayMovie(movie) {

    currentMovie = movie;

    movieTitle.textContent =
        movie.Title || "Unknown";

    movieGenre.textContent =
        movie.Genre || "MOVIE DETAILS";

    movieRating.textContent =
        `★ ${movie.imdbRating || "N/A"} / 10`;

    movieYear.textContent =
        movie.Year || "—";

    moviePlot.textContent =
        movie.Plot && movie.Plot !== "N/A"
            ? movie.Plot
            : "No overview available.";

    movieDirector.textContent =
        movie.Director || "—";

    movieGenreDetails.textContent =
        movie.Genre || "—";

    movieActors.textContent =
        movie.Actors || "—";

    movieLanguage.textContent =
        movie.Language || "—";

    ratingValue.textContent =
        movie.imdbRating || "N/A";

    ratingYear.textContent =
        movie.Year || "—";

    movieRuntime.textContent =
        movie.Runtime || "—";

    movieReleased.textContent =
        movie.Released || "—";


    if (
        movie.Poster &&
        movie.Poster !== "N/A"
    ) {

        moviePoster.src = movie.Poster;

    } else {

        moviePoster.src =
            "https://via.placeholder.com/300x450/090510/c084fc?text=No+Poster";
    }


    updateWatchButton();

    window.scrollTo({
        top: document.querySelector(".movie-section").offsetTop - 30,
        behavior: "smooth"
    });
}


/* -----------------------------
   SEARCH BUTTON
----------------------------- */

searchBtn.addEventListener(
    "click",
    () => {

        searchMovie(movieInput.value);

    }
);


/* -----------------------------
   ENTER KEY
----------------------------- */

movieInput.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Enter") {

            searchMovie(movieInput.value);

        }

    }
);


/* -----------------------------
   SEARCH SUGGESTIONS
----------------------------- */

let suggestionTimeout;

movieInput.addEventListener(
    "input",
    () => {

        clearTimeout(suggestionTimeout);

        const value =
            movieInput.value.trim();

        if (!value) {

            suggestions.innerHTML = "";
            return;
        }

        suggestionTimeout =
            setTimeout(
                () => getSuggestions(value),
                400
            );
    }
);


async function getSuggestions(query) {

    try {

        const response = await fetch(
            `${API_URL}?apikey=${API_KEY}&s=${encodeURIComponent(query)}`
        );

        const data =
            await response.json();

        suggestions.innerHTML = "";

        if (
            data.Response === "False" ||
            !data.Search
        ) {

            return;
        }

        data.Search
            .slice(0, 5)
            .forEach(movie => {

                const item =
                    document.createElement("div");

                item.className =
                    "suggestion-item";

                item.textContent =
                    `${movie.Title} (${movie.Year})`;

                item.addEventListener(
                    "click",
                    () => {

                        movieInput.value =
                            movie.Title;

                        suggestions.innerHTML = "";

                        searchMovie(movie.Title);
                    }
                );

                suggestions.appendChild(item);

            });

    } catch (error) {

        console.error(error);

    }
}


/* -----------------------------
   RECOMMENDATIONS
----------------------------- */

async function loadRecommendations(genreString) {

    recommendationGrid.innerHTML = "";

    if (!genreString) return;

    const genres =
        genreString
            .split(",")
            .map(g => g.trim());

    const selectedGenre =
        genres[0];

    const movieList = [];

    const searchTerms = [
        selectedGenre,
        "movie",
        "popular"
    ];

    try {

        for (
            const term of searchTerms
        ) {

            const response = await fetch(
                `${API_URL}?apikey=${API_KEY}&s=${encodeURIComponent(term)}&type=movie`
            );

            const data =
                await response.json();

            if (data.Search) {

                movieList.push(
                    ...data.Search
                );
            }

        }

        const uniqueMovies =
            [];

        const seen =
            new Set();

        movieList.forEach(movie => {

            if (
                !seen.has(movie.imdbID) &&
                movie.imdbID !== currentMovie?.imdbID
            ) {

                seen.add(movie.imdbID);

                uniqueMovies.push(movie);
            }

        });

        uniqueMovies
            .slice(0, 8)
            .forEach(movie => {

                createRecommendationCard(movie);

            });

    } catch (error) {

        console.error(error);
    }
}


function createRecommendationCard(movie) {

    const card =
        document.createElement("div");

    card.className =
        "recommendation-card";

    const poster =
        movie.Poster &&
        movie.Poster !== "N/A"
            ? movie.Poster
            : "https://via.placeholder.com/300x450/090510/c084fc?text=No+Poster";

    card.innerHTML = `
        <img src="${poster}" alt="${movie.Title}">
        <h3>${movie.Title}</h3>
        <p>${movie.Year}</p>
    `;

    card.addEventListener(
        "click",
        () => {

            searchMovie(movie.Title);

        }
    );

    recommendationGrid.appendChild(card);
}


/* -----------------------------
   WATCHLIST
----------------------------- */

watchBtn.addEventListener(
    "click",
    () => {

        if (!currentMovie) {

            showMessage(
                "Search for a movie first."
            );

            return;
        }

        const alreadyExists =
            watchlist.some(
                movie =>
                    movie.imdbID ===
                    currentMovie.imdbID
            );

        if (alreadyExists) {

            watchlist =
                watchlist.filter(
                    movie =>
                        movie.imdbID !==
                        currentMovie.imdbID
                );

        } else {

            watchlist.push({
                imdbID: currentMovie.imdbID,
                Title: currentMovie.Title,
                Year: currentMovie.Year,
                Poster: currentMovie.Poster
            });

        }

        saveWatchlist();

        updateWatchButton();

        displayWatchlist();
    }
);


/* -----------------------------
   UPDATE WATCH BUTTON
----------------------------- */

function updateWatchButton() {

    if (!currentMovie) {

        watchBtn.textContent =
            "+ Add to Watchlist";

        return;
    }

    const exists =
        watchlist.some(
            movie =>
                movie.imdbID ===
                currentMovie.imdbID
        );

    watchBtn.textContent =
        exists
            ? "✓ Remove from Watchlist"
            : "+ Add to Watchlist";
}


/* -----------------------------
   SAVE WATCHLIST
----------------------------- */

function saveWatchlist() {

    localStorage.setItem(
        "cinenovaWatchlist",
        JSON.stringify(watchlist)
    );
}


/* -----------------------------
   DISPLAY WATCHLIST
----------------------------- */

function displayWatchlist() {

    watchlistGrid.innerHTML = "";

    if (watchlist.length === 0) {

        watchlistGrid.innerHTML =
            `<p class="empty-watchlist">
                Your watchlist is empty.
                Search for movies and add them!
            </p>`;

        return;
    }

    watchlist.forEach(movie => {

        const card =
            document.createElement("div");

        card.className =
            "watchlist-card";

        const poster =
            movie.Poster &&
            movie.Poster !== "N/A"
                ? movie.Poster
                : "https://via.placeholder.com/300x450/090510/c084fc?text=No+Poster";

        card.innerHTML = `
            <img src="${poster}" alt="${movie.Title}">
            <h3>${movie.Title}</h3>
            <p>${movie.Year}</p>
        `;

        card.addEventListener(
            "click",
            () => {

                searchMovie(movie.Title);

            }
        );

        watchlistGrid.appendChild(card);

    });
}


/* -----------------------------
   CLEAR WATCHLIST
----------------------------- */

clearWatchlist.addEventListener(
    "click",
    () => {

        if (watchlist.length === 0) {
            return;
        }

        watchlist = [];

        saveWatchlist();

        displayWatchlist();

        updateWatchButton();
    }
);


/* -----------------------------
   WATCHLIST NAVIGATION
----------------------------- */

watchlistNav.addEventListener(
    "click",
    () => {

        document
            .getElementById("watchlist")
            .scrollIntoView({
                behavior: "smooth"
            });
    }
);


/* -----------------------------
   MODAL
----------------------------- */

function openModal(movie) {

    modalTitle.textContent =
        movie.Title;

    modalPoster.src =
        movie.Poster !== "N/A"
            ? movie.Poster
            : "https://via.placeholder.com/300x450/090510/c084fc?text=No+Poster";

    modalPlot.textContent =
        movie.Plot || "No overview available.";

    modalGenre.textContent =
        movie.Genre || "—";

    modalDirector.textContent =
        movie.Director || "—";

    modalActors.textContent =
        movie.Actors || "—";

    modalRating.textContent =
        movie.imdbRating || "N/A";

    movieModal.classList.add("show");
}


closeModal.addEventListener(
    "click",
    () => {

        movieModal.classList.remove("show");

    }
);


movieModal.addEventListener(
    "click",
    (event) => {

        if (event.target === movieModal) {

            movieModal.classList.remove("show");

        }

    }
);


/* -----------------------------
   MESSAGE
----------------------------- */

function showMessage(text) {

    message.textContent = text;

}


/* -----------------------------
   INITIAL LOAD
----------------------------- */

displayWatchlist();