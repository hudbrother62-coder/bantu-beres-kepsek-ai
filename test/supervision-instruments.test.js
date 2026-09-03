import test from "node:test";
import assert from "node:assert/strict";
import { scoreSupervision, supervisionInstruments } from "../assets/supervision-instruments.js";

test("four Drive supervision instruments are complete",() => {
  assert.deepEqual(Object.fromEntries(Object.entries(supervisionInstruments).map(([key,value]) => [key,value.items.length])),{ atp:12,module:24,administration:12,implementation:34 });
  for (const instrument of Object.values(supervisionInstruments)) {
    assert.match(instrument.sourceUrl,/^https:\/\/drive\.google\.com\/file\/d\//);
    assert.equal(new Set(instrument.items.map((item) => item.id)).size,instrument.items.length);
  }
});

test("supervision score follows the 0-2 rubric",() => {
  const responses = { 1:{ score:2 },2:{ score:1 },3:{ score:0 },4:{ note:"Belum dinilai",score:null } };
  assert.deepEqual(scoreSupervision(responses,4),{ total:3,max:8,percent:37.5,rating:"Perlu Pembinaan",answered:3,complete:false });
  const perfect = Object.fromEntries(Array.from({ length:12 },(_,index) => [String(index+1),{ score:2 }]));
  assert.deepEqual(scoreSupervision(perfect,12),{ total:24,max:24,percent:100,rating:"Sangat Baik",answered:12,complete:true });
});
