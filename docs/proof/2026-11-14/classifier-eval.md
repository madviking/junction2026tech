Status: active
Last reviewed: 2026-11-14

# cards.match classifier eval (2026-11-14)

Live run of `POST /api/cards/match` (through `llm.decide`, feature `cards.match`,
provider `openrouter`, model from `backend/llm/integrations.ts`) on the labelled set
`backend/cards/eval/labelled.yaml` (40 synthetic inputs: 21 English,
19 Finnish; 4 vague inputs expected to fall back to `choose`).
Options came from the seeded live content in Encore's test database. Guard rails:
`minConfidence` 0.55, `minMargin` 0.15 (`backend/cards/config.ts`).

Proof level: live provider call from `encore test` (`CARDS_EVAL_LIVE=1 encore test cards/eval/eval.live.test.ts`).

## Results

| Metric | Value |
| --- | --- |
| Top-1 accuracy when the answer was `confirm` | 100% (36/36) |
| Wrong confirms (card items + vague items) | 0 |
| Card items answered with `confirm` (coverage) | 100% (36/36) |
| Card items that fell back to `choose` | 0% (0/36) |
| Raw top-1 (highest probability = expected card, any status) | 100% (36/36) |
| Vague items correctly answered with `choose` | 100% (4/4) |
| Confirm accuracy, English / Finnish | 100% (19/19) / 100% (17/17) |
| Errors | 0 |
| Provider calls (llm_usage rows, cards.match) | 40 |
| Tokens | 15095 |
| Total cost (sum of llm_usage.cost_usd) | $0.001509 |

## Per item

| Id | Lang | Set | Input | Expected | Status | Top (p) / second p | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| en-01 | en | symptoms | I found a hard lump in my left breast last week | lump | confirm | lump 1.00 / 0.00 | ok |
| en-02 | en | symptoms | there is a swelling on the side of my neck that does not go away | lump | confirm | lump 0.99 / 0.01 | ok |
| en-03 | en | symptoms | I keep bleeding between my periods and I don't know why | bleeding | confirm | bleeding 0.98 / 0.01 | ok |
| en-04 | en | symptoms | there was blood in my pee this morning | bleeding | confirm | bleeding 0.64 / 0.14 | ok |
| en-05 | en | symptoms | I saw blood in the toilet after going to the bathroom | stool | confirm | stool 0.83 / 0.13 | ok |
| en-06 | en | symptoms | my bowels have changed a lot, constipation then diarrhoea for two months | stool | confirm | stool 0.99 / 0.00 | ok |
| en-07 | en | symptoms | I have been coughing for a month and lost some weight | cough | confirm | cough 0.64 / 0.35 | ok |
| en-08 | en | symptoms | my periods stopped years ago but now I am bleeding again | after_menopause | confirm | after_menopause 0.94 / 0.05 | ok |
| en-09 | en | symptoms | a mole on my back got bigger and darker | mole | confirm | mole 0.99 / 0.01 | ok |
| en-10 | en | symptoms | I am exhausted all the time, for weeks now, even after sleeping | tired | confirm | tired 1.00 / 0.00 | ok |
| en-11 | en | symptoms | my stomach hurts again and again, it keeps coming back | pain | confirm | pain 0.98 / 0.02 | ok |
| en-12 | en | symptoms | I am not hungry and my clothes are loose, I lost weight without trying | appetite | confirm | appetite 0.99 / 0.01 | ok |
| en-13 | en | symptoms | spot on my arm started bleeding and changed colour | mole | confirm | mole 0.97 / 0.02 | ok |
| fi-01 | fi | symptoms | Löysin rinnasta kovan kyhmyn | lump | confirm | lump 1.00 / 0.00 | ok |
| fi-02 | fi | symptoms | Kainalossa on patti, joka ei ole hävinnyt | lump | confirm | lump 0.96 / 0.03 | ok |
| fi-03 | fi | symptoms | Minulla on vuotoa kuukautisten välillä | bleeding | confirm | bleeding 0.99 / 0.00 | ok |
| fi-04 | fi | symptoms | Ulosteessa on ollut verta useamman kerran | stool | confirm | stool 0.99 / 0.00 | ok |
| fi-05 | fi | symptoms | Vatsan toiminta on muuttunut, ripulia ja ummetusta vuorotellen jo kuukausia | stool | confirm | stool 0.99 / 0.01 | ok |
| fi-06 | fi | symptoms | Olen yskinyt yli kuukauden enkä parane | cough | confirm | cough 0.99 / 0.00 | ok |
| fi-07 | fi | symptoms | Vaihdevuodet menivät ohi jo kauan sitten, mutta nyt tuli verta | after_menopause | confirm | after_menopause 0.97 / 0.02 | ok |
| fi-08 | fi | symptoms | Selässä oleva luomi on kasvanut ja vuotaa välillä | mole | confirm | mole 0.98 / 0.01 | ok |
| fi-09 | fi | symptoms | Olen koko ajan tosi väsynyt, jo monta viikkoa | tired | confirm | tired 0.99 / 0.00 | ok |
| fi-10 | fi | symptoms | Selkään sattuu yhä uudelleen, kipu palaa aina | pain | confirm | pain 1.00 / 0.00 | ok |
| fi-11 | fi | symptoms | Paino on laskenut kymmenen kiloa vaikka en ole laihduttanut | appetite | confirm | appetite 0.99 / 0.00 | ok |
| en-14 | en | route | I study at the University of Helsinki | A3 | confirm | A3 0.90 / 0.05 | ok |
| en-15 | en | route | I came from Ukraine and I have temporary protection | A5 | confirm | A5 0.96 / 0.02 | ok |
| fi-12 | fi | route | Työnantaja maksaa työterveyshuollon | A2 | confirm | A2 0.97 / 0.01 | ok |
| fi-13 | fi | route | Asun vastaanottokeskuksessa ja olen hakenut turvapaikkaa | A6 | confirm | A6 0.97 / 0.02 | ok |
| fi-14 | fi | route | Olen asunut Espoossa kymmenen vuotta, se on kotikuntani | A1 | confirm | A1 0.97 / 0.01 | ok |
| fi-19 | fi | route | Maksan käynnit itse, minulla on yksityinen vakuutus | A4 | confirm | A4 0.99 / 0.00 | ok |
| en-16 | en | outcomes/contact | I called three times and nobody picked up | no_answer | confirm | no_answer 0.99 / 0.01 | ok |
| en-17 | en | outcomes/contact | they gave me a time for next Tuesday | got_time | confirm | got_time 0.94 / 0.06 | ok |
| fi-15 | fi | outcomes/contact | Siellä sanottiin, että olen väärässä paikassa | wrong_door | confirm | wrong_door 0.92 / 0.06 | ok |
| en-18 | en | outcomes/visit | the doctor said she will send a referral to the hospital | referral_sent | confirm | referral_sent 0.98 / 0.01 | ok |
| fi-16 | fi | outcomes/followup | Kotiin tuli kirje, jossa on tulokset | result_letter | confirm | result_letter 0.97 / 0.01 | ok |
| en-21 | en | outcomes/wait | still no news from them, I have not heard anything | nothing_heard | confirm | nothing_heard 0.99 / 0.01 | ok |
| en-19 | en | symptoms | I just don't feel right | choose | choose | tired 0.32 / 0.27 | ok (choose) |
| en-20 | en | symptoms | something is wrong with my body | choose | choose | pain 0.21 / 0.17 | ok (choose) |
| fi-17 | fi | symptoms | En tiedä, jotain outoa | choose | choose | pain 0.16 / 0.15 | ok (choose) |
| fi-18 | fi | symptoms | Minua pelottaa | choose | choose | pain 0.19 / 0.16 | ok (choose) |

## Notes

- The labelled set was written by the builder on the night of the build, from the
  card texts. It shows the wiring and the guard rails work; it is not an independent
  accuracy estimate. Real resident wording (and Somali or Arabic input) still needs
  its own set.
- Closest confirm: en-07 ("coughing for a month and lost some weight") gave `cough`
  0.64 against `appetite` 0.35 — just above both thresholds and a genuine overlap.
- Vague inputs spread the probability (top 0.16–0.32), so they fell back to `choose`
  by both the confidence and the margin rule.
- The usage rows were written to Encore's test database for this run (the dev
  database's spend total does not include them).
