import http from "k6/http";
import { check } from "k6";

// TODO: Configure the load test options.
//
// k6 uses an "options" export to control how the test runs.
// Set "vus" (virtual users — simulated concurrent clients) to 20
// and "duration" to 30 seconds. See the k6 docs for the format.
export const options = {
    vus: 20,
    duration: "30s",
};

// TODO: Replace this with your service's external IP.
// Run `kubectl get service mandelbrot-service` and copy the EXTERNAL-IP.
const BASE_URL = "http://<YOUR-EXTERNAL-IP>";

// TODO: Implement the default function that k6 calls repeatedly for each
// virtual user.
//
// Each iteration should send a GET request to the /health endpoint and
// verify the response using k6's check() function. Confirm the status
// is 200 and that the response body contains a hostname.
//
// http.get(url) returns a response object with .status and .body properties.
// check(response, { "name": (r) => boolean }) runs named assertions and
// reports pass/fail rates in the k6 summary. Use JSON.parse() on the body
// to access fields like hostname.
export default function () {
    const res = http.get(`${BASE_URL}/health`);
    check(res, {
        "status is 200": (r) => r.status === 200,
        "body has hostname": (r) => {
            try {
                return JSON.parse(r.body).hostname !== undefined;
            } catch (e) {
                return false;
            }
        },
    });
}
