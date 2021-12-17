const constraints = {
    'video': false,
    'audio': true,
};

navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
        console.log('Got MediaStream:', stream);
    })
    .catch(error => {
        console.error('Error accessing media devices.', error);
    });

//
const container = document.querySelector(".container");
