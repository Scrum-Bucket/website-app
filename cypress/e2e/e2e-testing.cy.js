/**
 * Feature: Guest app entry
 *
 * Scenario: User enters the app as a guest
 *    GIVEN I am on the login page
 *    WHEN I continue as a guest
 *    THEN I arrive on the home page
 *    AND I can see the room navigation options
 */

describe("Guest app entry", () => {
  it("lets a user enter the app through the guest UI flow", () => {
    cy.visit("/");

    cy.contains("button", "Continue as Guest").click();

    cy.location("pathname").should("eq", "/home");
    cy.contains("Welcome, Guest").should("be.visible");
    cy.contains("button", "Join Room").should("be.visible");
  });
});
