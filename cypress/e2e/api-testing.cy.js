/**
 * Feature: Backend API acceptance checks
 *
 * Scenario: Backend health endpoint is available
 *    GIVEN the backend test server is running
 *    WHEN I send a GET request to the root endpoint
 *    THEN I receive a 200 response
 *    AND the backend reports that it is running
 *
 * Scenario: Backend sign-in endpoint accepts a valid access token
 *    GIVEN the backend test server has a shared access token
 *    WHEN I send a POST request with that token
 *    THEN I receive a bearer token response
 *
 * Scenario: Backend sign-in page is available
 *    GIVEN the backend test server is running
 *    WHEN I send a GET request to the sign-in endpoint
 *    THEN I receive the backend sign-in page
 */

describe("Backend API acceptance checks", () => {
  it("checks the backend health endpoint with a GET request", () => {
    cy.request(`${Cypress.env("apiUrl")}/`).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.eq("Backend running.");
    });
  });

  it("signs in to the backend API with a POST request", () => {
    cy.request({
      method: "POST",
      url: `${Cypress.env("apiUrl")}/signin`,
      headers: {
        Accept: "application/json",
      },
      body: {
        accessToken: Cypress.env("backendAccessToken"),
      },
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.tokenType).to.eq("Bearer");
      expect(response.body.token).to.be.a("string").and.not.be.empty;
    });
  });

  it("serves the backend sign-in page with a GET request", () => {
    cy.request(`${Cypress.env("apiUrl")}/signin?next=/users`).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.headers["content-type"]).to.include("text/html");
      expect(response.body).to.include("Backend Sign In");
      expect(response.body).to.include('name="next" value="/users"');
    });
  });
});
