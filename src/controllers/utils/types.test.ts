import { orgCountTuplesTypes } from "./types";

describe("parse database query", () => {
  it("should parse project stats query", () => {
    const raw = `{"(0x2e22df9a11e06c306ed8f64ca45ceae02efcf8a443371395a78371bc4fb6f722,1)","(0xf63f2a7159ee674aa6fce42196a8bb0605eafcf20c19e91a7eafba8d39fa0404,1)"}`;

    const result = orgCountTuplesTypes.parse(raw);

    expect(result).toEqual([
      [
        "0x2e22df9a11e06c306ed8f64ca45ceae02efcf8a443371395a78371bc4fb6f722",
        "1",
      ],
      [
        "0xf63f2a7159ee674aa6fce42196a8bb0605eafcf20c19e91a7eafba8d39fa0404",
        "1",
      ],
    ]);
  });
});
