import { DESTINATION_AIRPORT } from "../airports";

describe("DESTINATION_AIRPORT", () => {
  it("should be CUN (Cancun)", () => {
    expect(DESTINATION_AIRPORT).toBe("CUN");
  });
});
