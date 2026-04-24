## Available Commands
These are the available commands for Vinyl Bot.

### Want
 - `!want {spotify link}` - Adds the album to the want list

### Random
- `!random` - Chooses a random vinyl
- `!random {person}` - Chooses a random vinyl liked by that person
- `!random store` - Chooses a random store

### Play
Used to record when we play the vinyl
- `!play {spotify link}` - Adds a play for that album
- `!play {artist OR album}` -  Adds a play for that album. If there is more than one result, it will give you the   drop down

### Want list
- `!wantlist` - Gives you the whole want list
- `!wantlist {person}` - Gives you the want list of that person
- `!wantlist {search term}` - Gives you the want list items that match that term 

### Have List
It's the same as Want List just with `!have`

### Info
- `!info {album name}` - Gives you some info about the album

### Add
- `!add {spotify link}` - Adds the album to the database. It won't be complete so you'll have to finish it on the website.

### Top
There are three flavors of this one
- `!top {user}` - Returns the top artists by album count. If there is no user, then it is for the household. If there is a user, then it's for that user.
- `!top plays {user|artist}` - Returns the top albums by play count.
  - If there is no user or artist, it returns the top played albums of the household
  - If there is a user, it returns the top albums played for that user
  - If there is an artist - it returns the top albums played for that artist.
- `!top locations` - Returns the locations sorted by album count. Just to see if which stores sold us the most albums.
  - This will have a user variant in the future.  

### Unplayed
- `!unplayed` - Shows your unplayed albums