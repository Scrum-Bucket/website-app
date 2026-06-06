/**
 * Feature: Guest app entry
 *
 * Scenario: User enters the app as a guest
 *    GIVEN I am on the login page
 *    WHEN I continue as a guest
 *    THEN I arrive on the home page
 *    AND I can see the room navigation options
 *
 * Scenario: Guest opens the room-code join page
 *    GIVEN I am on the home page as a guest
 *    WHEN I choose Join Room
 *    THEN I arrive on the join-code page
 */

describe("Guest app entry", () => {
  it("lets a user enter the app through the guest UI flow", () => {
    cy.visit("/");

    cy.contains("button", "Continue as Guest").click();

    cy.location("pathname").should("eq", "/home");
    cy.contains("Welcome, Guest").should("be.visible");
    cy.contains("button", "Join Room").should("be.visible");
  });

  it("lets a guest navigate to the join-code page", () => {
    cy.visit("/");
    cy.contains("button", "Continue as Guest").click();

    cy.contains("button", "Join Room").click();

    cy.location("pathname").should("eq", "/home/code");
    cy.contains("Join by Code").should("be.visible");
    cy.get('input[aria-label="Room code"]').should("be.visible");
  });
});
