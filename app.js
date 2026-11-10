const express = require("express");
const morgan = require("morgan");

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(morgan("dev"));

// In-memory movie data
let movies = [
    { id: 1, title: "Inception", year: 2010, genre: "Sci-Fi" },
    { id: 2, title: "The Matrix", year: 1999, genre: "Sci-Fi" },
    { id: 3, title: "Parasite", year: 2019, genre: "Thriller" }
];

// Validate movie input
function validateMovie(body, partial = false) {
    const errors = [];

    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return ["Request body must be a JSON object."];
    }

    const allowedFields = ["title", "year", "genre"];
    const receivedFields = Object.keys(body);

    if (receivedFields.some(field => !allowedFields.includes(field))) {
        errors.push("Only title, year, and genre fields are allowed.");
    }

    if (!partial) {
        for (const field of allowedFields) {
            if (body[field] === undefined) {
                errors.push(`${field} is required.`);
            }
        }
    } else {
        if (receivedFields.length === 0) {
            errors.push("At least one field must be provided.");
        }
    }

    if (body.title !== undefined) {
        if (typeof body.title !== "string" || body.title.trim() === "") {
            errors.push("Title must be a non-empty string.");
        }
    }

    if (body.genre !== undefined) {
        if (typeof body.genre !== "string" || body.genre.trim() === "") {
            errors.push("Genre must be a non-empty string.");
        }
    }

    if (body.year !== undefined) {
        const currentYear = new Date().getFullYear();

        if (
            !Number.isInteger(body.year) ||
            body.year < 1888 ||
            body.year > currentYear + 5
        ) {
            errors.push(
                `Year must be an integer between 1888 and ${currentYear + 5}.`
            );
        }
    }

    return errors;
}

// Helper for validation errors
function sendValidationError(res, errors) {
    return res.status(400).json({
        error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request data.",
            details: errors
        }
    });
}

// GET /movies - Get all movies, with optional filtering and sorting
app.get("/movies", (req, res) => {
    let result = [...movies];

    const { genre, minYear, sort } = req.query;

    if (genre !== undefined) {
        if (typeof genre !== "string" || genre.trim() === "") {
            return sendValidationError(res, [
                "Genre filter must be a non-empty string."
            ]);
        }

        result = result.filter(
            movie => movie.genre.toLowerCase() === genre.trim().toLowerCase()
        );
    }

    if (minYear !== undefined) {
        const year = Number(minYear);

        if (!Number.isInteger(year) || year < 1888) {
            return sendValidationError(res, [
                "minYear must be a valid year."
            ]);
        }

        result = result.filter(movie => movie.year >= year);
    }

    if (sort !== undefined) {
        if (!["year", "title"].includes(sort)) {
            return sendValidationError(res, [
                "Sort must be either 'year' or 'title'."
            ]);
        }

        result.sort((a, b) => {
            if (sort === "year") {
                return a.year - b.year;
            }

            return a.title.localeCompare(b.title);
        });
    }

    res.status(200).json(result);
});

// GET /movies/:id - Get a single movie
app.get("/movies/:id", (req, res) => {
    const id = Number(req.params.id);
    const movie = movies.find(movie => movie.id === id);

    if (!movie) {
        return res.status(404).json({
            error: {
                code: "MOVIE_NOT_FOUND",
                message: `Movie with ID ${req.params.id} was not found.`
            }
        });
    }

    res.status(200).json(movie);
});

// POST /movies - Create a new movie
app.post("/movies", (req, res) => {
    const errors = validateMovie(req.body);

    if (errors.length > 0) {
        return sendValidationError(res, errors);
    }

    const newId =
        movies.length > 0
            ? Math.max(...movies.map(movie => movie.id)) + 1
            : 1;

    const newMovie = {
        id: newId,
        title: req.body.title.trim(),
        year: req.body.year,
        genre: req.body.genre.trim()
    };

    movies.push(newMovie);

    res.status(201).json(newMovie);
});

// PUT /movies/:id - Replace an entire movie
app.put("/movies/:id", (req, res) => {
    const id = Number(req.params.id);
    const movieIndex = movies.findIndex(movie => movie.id === id);

    if (movieIndex === -1) {
        return res.status(404).json({
            error: {
                code: "MOVIE_NOT_FOUND",
                message: `Movie with ID ${req.params.id} was not found.`
            }
        });
    }

    const errors = validateMovie(req.body);

    if (errors.length > 0) {
        return sendValidationError(res, errors);
    }

    const updatedMovie = {
        id: id,
        title: req.body.title.trim(),
        year: req.body.year,
        genre: req.body.genre.trim()
    };

    movies[movieIndex] = updatedMovie;

    res.status(200).json(updatedMovie);
});

// PATCH /movies/:id - Update selected movie fields
app.patch("/movies/:id", (req, res) => {
    const id = Number(req.params.id);
    const movieIndex = movies.findIndex(movie => movie.id === id);

    if (movieIndex === -1) {
        return res.status(404).json({
            error: {
                code: "MOVIE_NOT_FOUND",
                message: `Movie with ID ${req.params.id} was not found.`
            }
        });
    }

    const errors = validateMovie(req.body, true);

    if (errors.length > 0) {
        return sendValidationError(res, errors);
    }

    const updatedMovie = {
        ...movies[movieIndex]
    };

    if (req.body.title !== undefined) {
        updatedMovie.title = req.body.title.trim();
    }

    if (req.body.year !== undefined) {
        updatedMovie.year = req.body.year;
    }

    if (req.body.genre !== undefined) {
        updatedMovie.genre = req.body.genre.trim();
    }

    movies[movieIndex] = updatedMovie;

    res.status(200).json(updatedMovie);
});

// DELETE /movies/:id - Delete a movie
app.delete("/movies/:id", (req, res) => {
    const id = Number(req.params.id);
    const movieIndex = movies.findIndex(movie => movie.id === id);

    if (movieIndex === -1) {
        return res.status(404).json({
            error: {
                code: "MOVIE_NOT_FOUND",
                message: `Movie with ID ${req.params.id} was not found.`
            }
        });
    }

    movies.splice(movieIndex, 1);

    res.status(204).send();
});

// Handle unknown routes
app.use((req, res) => {
    res.status(404).json({
        error: {
            code: "ROUTE_NOT_FOUND",
            message: "The requested endpoint does not exist."
        }
    });
});

// General error handler
app.use((err, req, res, next) => {
    console.error(err);

    if (err.type === "entity.parse.failed") {
        return res.status(400).json({
            error: {
                code: "INVALID_JSON",
                message: "The request body contains invalid JSON."
            }
        });
    }

    if (err.type === "entity.too.large") {
        return res.status(413).json({
            error: {
                code: "PAYLOAD_TOO_LARGE",
                message: "The request body is too large."
            }
        });
    }

    res.status(500).json({
        error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "An unexpected server error occurred."
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Movie API is running at http://localhost:${PORT}`);
});