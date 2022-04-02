const functions = require("firebase-functions");
const adminModule = require('firebase-admin');
const admin = adminModule.initializeApp();
const haversine = require('haversine-distance')
// Adding New Buyer
exports.addBuyer = functions.https.onRequest(async (req, res) => {
    if (req.method == 'POST') {
        const { name, email, password, contact } = req.body;
        const writeResult = await admin.firestore().collection('buyers').add({
            name: name,
            email: email,
            password: password,
            contact: contact
        });
        res.json({ result: `Buyer with ID: ${writeResult.id} added.` });
    }
});
// Adding New Seller
exports.addSeller = functions.https.onRequest(async (req, res) => {
    if (req.method == 'POST') {
        const { name, email, password, contact } = req.body;
        const writeResult = await admin.firestore().collection('sellers').add({
            name: name,
            email: email,
            password: password,
            contact: contact
        });
        res.json({ result: `Seller with ID: ${writeResult.id} added.` });
    }
});
// Adding New Package
exports.addPackage = functions.https.onRequest(async (req, res) => {
    try {
        if (req.method == 'POST') {

            const { buyer, seller, metal, quantity, origin, destination } = req.body;
            const writeResult = await admin.firestore().collection('packages').add({
                buyer: buyer,
                seller: seller,
                metal: metal,
                quantity: quantity,
                origin: origin,
                destination: destination
            });
            res.json({ result: `Package with ID: ${writeResult.id} added.` });
        }
    } catch (error) {
        res.json({ msg: error });
    }
});
// Create Shipment
exports.createShippment = functions.https.onRequest(async (req, res) => {
    try {
        if (req.method == 'POST') {
            const { shipmentType, packages } = req.body;
            if (shipmentType == 'truck') {
                const package = await admin.firestore()
                    .collection("packages")
                    .doc(packages)
                    .get()
                    .then(snapshot => {
                        if (snapshot.data() !== null && snapshot.data() !== undefined) {
                            return snapshot.data();
                        }
                    });
                const originLat = package.origin[0];
                const originLong = package.origin[1];
                const destinationLat = package.destination[0];
                const destinationLong = package.destination[1];
                const origin = { lat: originLat, lng: originLong };
                const destination = { lat: destinationLat, lng: destinationLong };
                const distance = haversine(origin, destination);
                const distanceInKms = distance / 1000
                const writeResult = await admin.firestore().collection('shipments').add({
                    shipmentType: shipmentType,
                    packages: packages,
                    carbonEmission: distanceInKms.toFixed(2)
                });
                res.json({ result: `Shipment with ID: ${writeResult.id} is created.` });
            } else if (shipmentType == 'rail') {
                const packagesAll = []
                for (let i = 0; i < packages.length; i++) {
                    const id = packages[i];
                    await admin.firestore()
                        .collection("packages")
                        .doc(id)
                        .get()
                        .then(snapshot => {
                            if (snapshot.data() !== null && snapshot.data() !== undefined) {
                                packagesAll.push(snapshot.data());
                            }
                        });
                }

                const distances = [];
                packagesAll.forEach((package) => {
                    const originLat = package.origin[0];
                    const originLong = package.origin[1];
                    const destinationLat = package.destination[0];
                    const destinationLong = package.destination[1];
                    const origin = { lat: originLat, lng: originLong };
                    const destination = { lat: destinationLat, lng: destinationLong };
                    const distance = haversine(origin, destination);
                    const distanceInKms = distance / 1000
                    distances.push(distanceInKms)
                })
                const maxDistance = Math.max(...distances);
                const writeResult = await admin.firestore().collection('shipments').add({
                    shipmentType: shipmentType,
                    packages: packages,
                    carbonEmission: maxDistance.toFixed(2)
                });
                res.json({ result: `Shipment with ID: ${writeResult.id} is created.` });

            }
        }
    } catch (error) {
        res.json({ msg: error });
    }
});

// Adding New Package
exports.shipmentReport = functions.https.onRequest(async (req, res) => {
    try {
        if (req.method == 'GET') {
            const snapshot = await admin.firestore().collection('shipments').get()
            const collection = {};
            snapshot.forEach(doc => {
                collection[doc.id] = doc.data();
            });
            var shippedPackages = [];
            for (const shipment in collection) {
                var ship = collection[shipment];
                if (ship.shipmentType == 'rail') {
                    var pack = ship.packages;
                    for (let i = 0; i < pack.length; i++) {
                        const element = pack[i];
                        shippedPackages.push(element);
                    }
                } else {
                    shippedPackages.push(ship.packages)
                }

            }
            const packagesAll = []
            for (let i = 0; i < shippedPackages.length; i++) {
                const id = shippedPackages[i];
                await admin.firestore()
                    .collection("packages")
                    .doc(id)
                    .get()
                    .then(snapshot => {
                        if (snapshot.data() !== null && snapshot.data() !== undefined) {
                            packagesAll.push(snapshot.data());
                        }
                    });
            }
            res.json({ result: packagesAll });
        }
    } catch (error) {
        res.json({ msg: error });
    }
});
