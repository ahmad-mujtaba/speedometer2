// self.addEventListener('fetch', function (event) {
//     console.log(event.request.url);
//     if (event.request.url.indexOf("export") !== -1) {
//         console.info('getting to work..');
//         //console.info(event.request.formData());
//         event.respondWith(event.request.formData().then(function (formdata) {
//             var filename = formdata.get("filename") + '.json';
//             var body = formdata.get("data");
//             var response = new Response(body);
//             response.headers.append('Content-Disposition', 'attachment; filename="' + filename + '"');
//             return response;
//         }));
//     }
// });