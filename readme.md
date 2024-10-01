# 🎵 Project SAM (Spotify Artist Map) 🎵

**Project SAM (Spotify Artist Map)** is a visual tool that allows users to explore the connections between two chosen artists by utilizing artist collaborations. Inspired by both the Wikipedia game and the theory of **6 degrees of separation**, this project visualizes how closely related any two artists are by leveraging the Spotify API for data.

---

## Features
- **Artist Collaboration Mapping**: Displays the network of connections between artists using Spotify API data.
- **Visual Data Representation**: React frontend that visualizes the connections in a graph structure.
- **WebSocket Communication**: real-time data updates via WebSockets.
- **6 Degrees of Separation Theory**: See how any two artists are connected through collaborations.
  
---

## Technology Stack
- **Frontend**: React.js for a responsive and interactive user interface.
- **Backend**: FastAPI for handling API requests, WebSockets, and data retrieval from Spotify's API.\
- **Database**: PostgreSQL database for caching spotify information.
- **Spotify API**: Utilized to fetch artist data and collaboration information.
  
---

## Known Issues
- **Data Retrieval Delays**: Due to the structure and limitations of Spotify's API, large data queries may take time, resulting in occasional WebSocket connection issues.
- **Production Environment Challenges**: This project is not optimized for scalability, and encounters problems in production environments that were found late in development. 
- **Long fetch time issues**: At longer durations, both the websocket and HTTP request can error out, which is not handled correctly. Fixing this requires alot of rewriting and is not appropriate for the scale of the project. 
- **Handling no Path**: Because of the nature of the algorithm, if the lack of path is not noticeable from the beggining the algorithm instead begins searching and will time-out (as mentioned above) before discovering no path is possible.  
