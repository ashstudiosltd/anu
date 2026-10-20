# Local Anu conversation preview

Run `npm run dev` and open http://localhost:5173/demo.

The development-only `/demo` page uses the same chat layout and animated Anu character as the main app. Replies are simulated in the browser; account refresh, remote history, and chat API calls are bypassed. Demo conversations remain in memory and disappear on reload. The stop button cancels the simulated reply.

The main `/` page retains its real account and chat behavior. `/demo` returns not found outside development, so the simulation is not enabled by a production deployment. The temporary demo route and `localDemo` branches can be removed after visual testing.

Anu stays mounted when moving from the welcome view into a conversation. Her dedicated space sits above the message scroller; her body and gaze ease into their smaller chat pose. Focusing the composer keeps her watching it, inserting text briefly raises her black magnifying glass, and deleting or pausing lowers it.
