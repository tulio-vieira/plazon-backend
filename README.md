# Plazon backend

This is the backend of [Plazon](https://plazon.herokuapp.com/feed), a social network inspired by Twitter and Reddit, created with the MERN stack (MongoDB, Express, React, Nodejs). The React frontend implements the [Material UI](https://material-ui.com/) library, and can be found [here](https://github.com/tulio-vieira/plazon-frontend).

This app implements authentication, user configuration, image uploads, linkage to videos (youtube or vimeo), like system, threaded comment section, user pages, search box and more.

The database has been populated by users and posts from Reddit using the Reddit API, which can be accessed very easily by just adding `.json` to the end of reddit urls.

## API endpoints

The following items describe all the endpoints of this API. "Protected" means that it can only be accessed with a valid JWT token, that is obtained by logging in with the register route.

* **Authentication**

  | Method |            URL            | Protected |           Response          |
  | ------ |:--------------------------| :-------: | --------------------------: |
  | POST    | /api/register/           |    No     | Register new user           |
  | POST    | /api/login/:id           |    No     | Login with credentials      |



* **Users route**

  | Method |            URL            | Protected |           Response          |
  | ------ |:--------------------------| :-------: | --------------------------: |
  | GET    | /api/users/               |    No     | Paginated list of users                                         |
  | GET    | /api/users/:id            |    No     | Information about some user                                     |
  | GET    | /api/users/:id/posts      |    No     | Paginated list of some user's posts                             |
  | GET    | /api/users/:id/comments   |    No     | Paginated list of some user's comments                          |
  | GET    | /api/users/:id/followers  |    No     | Paginated list of some user's followers                         |
  | GET    | /api/users/:id/following  |    No     | Paginated list of users that are being followed by some user    |
  | POST   | /api/users/:id            |    Yes    | Follow/unfollow user                                            |
  | POST   | /api/users/:id/edit       |    Yes    | Update user                                                     |


* **Posts route**
  
  | Method |            URL            | Protected |           Response          |
  | ------ |:--------------------------| :-------: | --------------------------: |
  | GET    | /api/posts/               |    No     | Paginated list of posts                                          |
  | GET    | /api/posts/:id            |    No     | Detailed information of post and paginated list of its comments  |
  | POST   | /api/posts/               |    Yes    | Create new post                             |
  | POST   | /api/posts/:id            |    Yes    | Like/dislike post                           |


* **Comments route**
  
  | Method |            URL            | Protected |           Response          |
  | ------ |:--------------------------| :-------: | --------------------------: |
  | GET    | /api/comments/:id            |    No     | List of comments belonging to some parent comment or post   |
  | POST   | /api/comments/               |    Yes    | Create new comment                             |
  | POST   | /api/comments/:id            |    Yes    | Like/dislike comment                           |


## How to use it

Download this repository and open the terminal in its root directory. Then, create a `.env` file and set the `SECRET`, `DB_STRING`, and `JWT_KEY` environment variables. Download all the dependencies using `npm install`, and then run `npm start` to start the app on port 3100.