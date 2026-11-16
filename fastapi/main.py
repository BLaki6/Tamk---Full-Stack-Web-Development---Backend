
from datetime import date

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI()

MAX_YEAR = date.today().year + 5

# Movie data
movies = [
    {"id": 1, "title": "Inception", "year": 2010, "genre": "Sci-Fi"},
    {"id": 2, "title": "The Matrix", "year": 1999, "genre": "Sci-Fi"},
    {"id": 3, "title": "Parasite", "year": 2019, "genre": "Thriller"}
]


# Movie models
class MovieCreate(BaseModel):
    title: str = Field(min_length=1, strip_whitespace=True)
    year: int = Field(ge=1888, le=MAX_YEAR)
    genre: str = Field(min_length=1, strip_whitespace=True)


class MovieUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, strip_whitespace=True)
    year: int | None = Field(default=None, ge=1888, le=MAX_YEAR)
    genre: str | None = Field(default=None, min_length=1, strip_whitespace=True)


@app.get("/")
def root():
    return {"message": "Hello from FastAPI"}


@app.get("/movies")
def get_movies(
    genre: str | None = None,
    minYear: int | None = None,
    sort: str | None = None
):
    result = movies.copy()

    if genre:
        result = [
            movie for movie in result
            if movie["genre"].lower() == genre.lower()
        ]

    if minYear is not None:
        result = [
            movie for movie in result
            if movie["year"] >= minYear
        ]

    if sort == "year":
        result = sorted(result, key=lambda movie: movie["year"])
    elif sort == "title":
        result = sorted(result, key=lambda movie: movie["title"].lower())
    elif sort is not None:
        raise HTTPException(
            status_code=400,
            detail="Sort must be 'year' or 'title'"
        )

    return result


@app.get("/movies/{movie_id}")
def get_movie(movie_id: int):
    for movie in movies:
        if movie["id"] == movie_id:
            return movie

    raise HTTPException(status_code=404, detail="Movie not found")


@app.post("/movies", status_code=201)
def create_movie(movie: MovieCreate):
    new_id = max(m["id"] for m in movies) + 1

    new_movie = {
        "id": new_id,
        **movie.model_dump()
    }

    movies.append(new_movie)
    return new_movie


@app.put("/movies/{movie_id}")
def update_movie(movie_id: int, movie: MovieCreate):
    for index, existing_movie in enumerate(movies):
        if existing_movie["id"] == movie_id:
            updated_movie = {
                "id": movie_id,
                **movie.model_dump()
            }
            movies[index] = updated_movie
            return updated_movie

    raise HTTPException(status_code=404, detail="Movie not found")


@app.patch("/movies/{movie_id}")
def patch_movie(movie_id: int, movie: MovieUpdate):
    for existing_movie in movies:
        if existing_movie["id"] == movie_id:
            existing_movie.update(
                movie.model_dump(exclude_unset=True)
            )
            return existing_movie

    raise HTTPException(status_code=404, detail="Movie not found")


@app.delete("/movies/{movie_id}", status_code=204)
def delete_movie(movie_id: int):
    for movie in movies:
        if movie["id"] == movie_id:
            movies.remove(movie)
            return

    raise HTTPException(status_code=404, detail="Movie not found")
