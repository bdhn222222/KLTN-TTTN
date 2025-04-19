// ... existing code ...

// Add this at the end of your app.js after defining all routes
console.log("======= REGISTERED ROUTES =======");
app._router.stack.forEach(function (r) {
  if (r.route && r.route.path) {
    console.log(`${Object.keys(r.route.methods).join(",")} ${r.route.path}`);
  } else if (r.name === "router") {
    r.handle.stack.forEach(function (layer) {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(",");
        console.log(`${methods} ${layer.route.path}`);
      }
    });
  }
});
console.log("=================================");

// ... existing code ...
