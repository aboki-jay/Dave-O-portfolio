/*
  cloudflare-worker/playlists-to-show.js
  --------------------------------------
  The playlists listed on the About page, in the order they appear there.
  The first four are in view; visitors scroll inside the list for the rest.

  Each line is the playlist's Spotify link (in Spotify: the three dots on the playlist, Share,
  Copy link to playlist), with its name after it as a reminder. The name, cover and number of
  songs shown on the site come from Spotify itself, so renaming a playlist there renames it here.

  A playlist that is set to private on Spotify is skipped, even if it is listed here.
  With no lines here, the About page shows no playlist list.
*/

export const PLAYLISTS_TO_SHOW = [
  "https://open.spotify.com/playlist/3p0Lp423rk0yg7WVqy1DYY", // Jon Bellion All-Time Favorites
  "https://open.spotify.com/playlist/4TkuYR68vEpULT6BScI1tX", // E for Energy
  "https://open.spotify.com/playlist/1sCaEjXJR2QQizCriPfHXh", // Afrobeats Mixology
  "https://open.spotify.com/playlist/00qJKNdHn7G7mdYqj0RFow", // African Heat
];
