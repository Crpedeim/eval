# RAG eval — hotpotqa-dev-distractor-150 (run cmwkpgb5t0000wkmke8iv1yiq)

- Date: 2026-11-17T13:05:19.745Z
- Models: generator `gemini-3.8-flash`, embedder `gemini-embedding-001`, judge `gemini-3.8-flash`
- Retrieval: hybrid
- k = 5; questions: 150 (150 answered, 0 failed)
- Wall clock from enqueue to all items + judges settled: 956s

| Metric | Value |
|---|---|
| Recall@5 | 0.774 |
| Hit rate@5 | 0.973 |
| MRR@5 | 0.784 |
| rag-answer-relevance (mean score / pass rate @0.7) | 0.647 / 0.647 (150 judged, 0 errored) |
| rag-faithfulness (mean score / pass rate @0.7) | 1.000 / 1.000 (150 judged, 0 errored) |
| Answers with ≥1 citation | 0.660 |
| Citation precision (cited chunk is labelled relevant) | 0.919 |
| "I don't know" answers | 51 |
| Request latency p50 / p95 | 2746 / 4062 ms |
| retrieve span p50 / p95 | 664 / 942 ms |
| generate span p50 / p95 | 2074 / 3300 ms |
| Generate prompt / output tokens (mean) | 920 / 52.9 |
| Generate tokens/sec (median / mean / aggregate) | 16.9 / 20.9 / 23.5 |
| Cost per request (retrieve + generate, mean) | $0.000892 |
| Total cost of answered requests | $0.133804 |
| Judge cost per answer (mean, 300 judge calls costed) | $0.003748 |
| **Cost per eval answer incl. judges (mean)** | $0.004640 |
| Judge tokens in / out (total, out incl. thinking) | 344326 / 81065 |
| Total cost incl. judges | $0.696042 |

## Per question

| id | recall | RR | rag-answer-relevance | rag-faithfulness | latency | answer |
|---|---|---|---|---|---|---|
| 5a7133fa5542994082a3e660 | 1.00 | 1.00 | 1.00 | 1.00 | 3639 ms | The current manager of Chinese club Tianjin Quanjian, Fabio Cannavaro, is the older brother of Paolo Cannavaro [1][3]. |
| 5a727e1b5542991f9a20c497 | 0.67 | 0.25 | 1.00 | 1.00 | 3363 ms | The optimistic lyrical message of "Yodel It!" was compared to that of Taylor Swift's "Shake It Off" (2014) [4]. |
| 5a728fbd5542992359bc30f8 | 1.00 | 1.00 | 1.00 | 1.00 | 2363 ms | The director of *Schoolboy Crush* was Bryan Kocis (also known as Bryan Phillips) [1][3]. Harlow Cuadra and Joseph Kerekes were convicted of his murder [3]. |
| 5a72e28f5542992359bc31ba | 0.50 | 0.20 | 0.00 | 1.00 | 3057 ms | I don't know based on the provided documents. |
| 5a7324205542994cef4bc478 | 1.00 | 1.00 | 1.00 | 1.00 | 3161 ms | Rumi is a poet, specifically a 13th-century Persian poet [1][3][4]. In contrast, Farouk El-Baz is an Egyptian American space scientist who worked with NASA [2]. |
| 5a73cf5e55429978a71e909f | 0.33 | 1.00 | 1.00 | 1.00 | 3622 ms | Mike Leach is the head coach of the Washington State Cougars football team [1]. |
| 5a75176a5542993748c897b6 | 0.50 | 0.50 | 0.00 | 1.00 | 2523 ms | I don't know based on the provided documents. |
| 5a7543d555429916b01642ce | 1.00 | 1.00 | 1.00 | 1.00 | 2582 ms | Flula Borg was born more recently, having been born on March 28, 1982 [1]. In comparison, Dirk Nowitzki was born earlier, on June 19, 1978 [2]. |
| 5a7555215542996c70cfaee1 | 1.00 | 1.00 | 1.00 | 1.00 | 2456 ms | "Hey Pa! There's a Goat on the Roof" came to market first [1][2]. It was issued in 1966 [1], whereas "Poleconomy" was first published in 1980 [2]. |
| 5a7568175542992d0ec05f88 | 1.00 | 0.50 | 1.00 | 1.00 | 2388 ms | The French comedy directed by Philippe de Chauveron starring Julia Piaton is *Serial (Bad) Weddings* [2][5]. |
| 5a762a645542992d0ec0603d | 0.50 | 0.50 | 1.00 | 1.00 | 2441 ms | The Hyundai Stellar was produced by the Hyundai Motor Company [2], a South Korean manufacturer [4]. |
| 5a7631cd5542994ccc91870c | 1.00 | 0.50 | 1.00 | 1.00 | 2377 ms | Jeanne Marie Beaumont directed The Frost Place Advanced Seminar from 2007–2010 [2]. The Frost Place is located at Robert Frost's former home in Franconia, New H |
| 5a76dc2d55429972597f13eb | 0.50 | 1.00 | 0.00 | 1.00 | 2512 ms | I don't know based on the provided documents. |
| 5a7796e05542992a6e59df0f | 1.00 | 1.00 | 1.00 | 1.00 | 2769 ms | The Huis Ten Bosch train service serves the Huis Ten Bosch theme park [1], which recreates the Netherlands by displaying life-sized copies of old Dutch building |
| 5a77a7565542995d83181249 | 0.50 | 0.33 | 0.00 | 1.00 | 2027 ms | I don't know based on the provided documents. |
| 5a77aa095542995d83181260 | 0.67 | 1.00 | 0.00 | 1.00 | 2365 ms | I don't know based on the provided documents. |
| 5a77ba6c55429967ab10524c | 1.00 | 1.00 | 1.00 | 1.00 | 2928 ms | The director of the American short slasher film featuring French-speaking serial killers released on October 31, 2011 is Shia LaBeouf [1]. Shia LaBeouf was born |
| 5a77c15f5542997042120b1c | 0.50 | 1.00 | 0.00 | 1.00 | 2747 ms | I don't know based on the provided documents. |
| 5a78b386554299148911f949 | 0.00 | 0.00 | 0.00 | 1.00 | 3669 ms | I don't know based on the provided documents. |
| 5a78ce79554299029c4b5ea1 | 1.00 | 1.00 | 1.00 | 1.00 | 2649 ms | Jacques Coghen is a direct ancestor of King Philippe of Belgium [1]. King Philippe is married to Queen Mathilde (formerly Countess Mathilde d'Udekem d'Acoz) [2] |
| 5a78f1b555429970f5fffde9 | 0.50 | 0.33 | 0.00 | 1.00 | 3489 ms | I don't know based on the provided documents. |
| 5a78f8e555429970f5fffe01 | 1.00 | 1.00 | 1.00 | 1.00 | 2551 ms | The British diver featured in *Splash!* is Tom Daley, who specialises in the 10-metre platform event [1][5]. |
| 5a79186f55429907847277af | 1.00 | 1.00 | 1.00 | 1.00 | 2633 ms | The stadium named after Rodney Cline Carew, also known as Estadio Nacional de Panamá or Estadio Rod Carew, is located in Panama City, Panama [1][3][4]. |
| 5a7943ea5542994bb9456fd3 | 1.00 | 1.00 | 1.00 | 1.00 | 3756 ms | Pioneer 4 flew by the Moon on a lunar flyby trajectory before entering a heliocentric orbit, which is the type of orbit that all planets in the Solar System fol |
| 5a7a5aea5542996c55b2dd6f | 0.67 | 0.50 | 0.00 | 1.00 | 3680 ms | I don't know based on the provided documents. |
| 5a7b895c5542997c3ec97206 | 0.60 | 1.00 | 0.00 | 1.00 | 1969 ms | I don't know based on the provided documents. |
| 5a7c3178554299683c1c62e1 | 1.00 | 0.50 | 1.00 | 1.00 | 2679 ms | The laboratory that co-developed and launched FORTE is the Los Alamos National Laboratory [2][4]. During World War II, it was initially organized to design nucl |
| 5a7c96e55542990527d554d9 | 1.00 | 1.00 | 1.00 | 1.00 | 3132 ms | Pre's Trail was named after University of Oregon athlete Steve Prefontaine [1]. Prefontaine died at the age of 24 in an automobile accident in Eugene, Oregon [3 |
| 5a7c9d2e55429935c91b5261 | 1.00 | 1.00 | 1.00 | 1.00 | 2774 ms | The horror film *Ghostkeeper* was inspired by the Windigo (or Wendigo) legend of North America [1]. This legend lends its name to the modern medical term "Wendi |
| 5a7cb5f0554299452d57b9b5 | 0.67 | 0.50 | 0.00 | 1.00 | 2420 ms | I don't know based on the provided documents. |
| 5a7cdc1b55429907fabef04d | 1.00 | 1.00 | 1.00 | 1.00 | 2535 ms | *Getting Married in Buffalo Jump* stars the actor Paul Gross [1]. He was born in Calgary, Alberta [2]. |
| 5a7cef6955429909bec768ad | 1.00 | 1.00 | 1.00 | 1.00 | 3799 ms | Crested Butte, Colorado is a municipality in Gunnison County that is now called "the last great Colorado ski town" [2]. It is also located near the Lucky Jack m |
| 5a7d1d825542995ed0d165f5 | 0.50 | 1.00 | 0.00 | 1.00 | 2541 ms | I don't know based on the provided documents. |
| 5a7d26fd554299452d57bb2a | 1.00 | 0.50 | 1.00 | 1.00 | 3264 ms | The film *The Ghost and the Darkness* is based on the Tsavo Man-Eaters, a pair of lions responsible for attacking and killing railway workers in 1898 [2][4]. Th |
| 5a7d54165542995f4f402256 | 1.00 | 1.00 | 1.00 | 1.00 | 3062 ms | The medieval fortress is Dirleton Castle, which borders the south side of Yellowcraig (also known as Yellowcraigs or Broad Sands Bay) [1][2]. Yellowcraig is a c |
| 5a7de14a5542991319bc93fc | 1.00 | 1.00 | 1.00 | 1.00 | 3603 ms | The neighborhood Plainview is located in the home rule-class city of Jeffersontown, Kentucky, which had a population of 26,595 at the 2010 census [1][5]. |
| 5a7e19e655429965cec5ea58 | 1.00 | 1.00 | 0.00 | 1.00 | 2042 ms | I don't know based on the provided documents. |
| 5a7e1a2955429965cec5ea5d | 0.50 | 0.33 | 0.00 | 1.00 | 3028 ms | I don't know based on the provided documents. |
| 5a7e3117554299495941991b | 0.50 | 1.00 | 0.00 | 1.00 | 2507 ms | I don't know based on the provided documents. |
| 5a7f0c4b5542993067513600 | 1.00 | 1.00 | 1.00 | 1.00 | 2941 ms | The nickname "Buffalo Soldiers" was given to the African American cavalrymen by Native Americans, specifically the Native American tribes they fought in the Ind |
| 5a7f650755429969796c1a2c | 0.33 | 1.00 | 1.00 | 1.00 | 3687 ms | Since the 1950s, ESZ has also represented Igor Stravinsky and Carl Orff as the Italian agent of Schott Music [1]. |
| 5a7f9cb55542995d8a8ddec1 | 1.00 | 1.00 | 1.00 | 1.00 | 2554 ms | Both Franz Ferdinand and Sunrise Avenue were formed in 2002 [1][4]. |
| 5a7faa215542995d8a8ddee8 | 1.00 | 1.00 | 1.00 | 1.00 | 3820 ms | Middleton Grange Shopping Centre was opened in 1970 by Princess Anne [1]. Princess Anne's mother is Queen Elizabeth II [3]. |
| 5a8078d85542995d8a8ddf78 | 1.00 | 1.00 | 1.00 | 1.00 | 3852 ms | Kill Hannah is the rock band from Chicago, Illinois [2]. Louis XIV is from San Diego, California [1]. |
| 5a808f3f5542992097ad2ffd | 0.50 | 1.00 | 1.00 | 1.00 | 5127 ms | The Columbia River Subdivision was built as part of James J. Hill's Great Northern Railway transcontinental railway line, and it is operated by BNSF Railway as  |
| 5a81346055429926c1cdad13 | 0.33 | 1.00 | 0.00 | 1.00 | 3299 ms | I don't know based on the provided documents. |
| 5a81ff62554299676cceb1c4 | 1.00 | 1.00 | 0.00 | 1.00 | 2690 ms | I don't know based on the provided documents. |
| 5a820cb355429903bc27ba2f | 1.00 | 1.00 | 1.00 | 1.00 | 3672 ms | Reimar Horten helped initially design the aircraft (also known as the Horten Ho 229) alongside Walter Horten [1]. He later died on 14 March 1994 in Villa Genera |
| 5a8220db5542995ce29dccc1 | 1.00 | 1.00 | 1.00 | 1.00 | 2983 ms | Rose Mary Woods was Richard Nixon's secretary from his days in Congress in 1951 through the end of his political career [1]. In contrast, H. R. Haldeman served  |
| 5a8257fa55429940e5e1a866 | 0.50 | 0.50 | 1.00 | 1.00 | 2330 ms | The last monarch of Hawaii was Queen Liliʻuokalani [1][3]. Her most famous song was "Aloha ʻOe" ("Farewell to Thee") [2]. |
| 5a8303c255429954d2e2ec01 | 0.50 | 1.00 | 0.00 | 1.00 | 2568 ms | I don't know based on the provided documents. |
| 5a8319b255429940e5e1a960 | 1.00 | 1.00 | 1.00 | 1.00 | 2947 ms | Danny Elfman composed the theme music in 1989 for the animated television series *The Simpsons* [1]. The series' current theme arrangement was introduced by Alf |
| 5a8327fd5542990548d0b1a3 | 1.00 | 1.00 | 1.00 | 1.00 | 2754 ms | Forest Hill, Texas is a suburb of Fort Worth [4]. Fort Worth is the fifth-largest city in the state of Texas [1]. |
| 5a84a8ce5542997175ce1f1c | 0.50 | 1.00 | 0.00 | 1.00 | 2401 ms | I don't know based on the provided documents. |
| 5a85e2775542994775f60680 | 1.00 | 1.00 | 1.00 | 1.00 | 2332 ms | Elisha Cuthbert stars in the film *Just Before I Go* [1]. In the series "24", she plays the character Kim Bauer [3]. |
| 5a85fb5e5542994775f606df | 1.00 | 1.00 | 1.00 | 1.00 | 2535 ms | The Calabrian black squirrel is endemic to the south of the Italian Peninsula [1]. The shape of the Italian Peninsula gives it the nickname "lo Stivale" (the Bo |
| 5a8662da5542991e7718162f | 1.00 | 1.00 | 1.00 | 1.00 | 2580 ms | Max Carl plays the guitar, as he is described as an American rock singer, keyboardist, guitarist, and songwriter [2]. In contrast, Denis Bélanger is a vocalist  |
| 5a872c3f5542994775f607a8 | 1.00 | 0.50 | 1.00 | 1.00 | 2723 ms | EOG Resources, Inc. is an American petroleum and natural gas exploration company [2]. In contrast, General Mills, Inc. is an American multinational manufacturer |
| 5a87ab9b5542996e4f3088c2 | 1.00 | 0.50 | 1.00 | 1.00 | 2645 ms | Tecumseh became the primary leader of a large, multi-tribal confederacy in the early years of the nineteenth century [2]. |
| 5a87bd4e5542996432c57279 | 1.00 | 0.50 | 1.00 | 1.00 | 2824 ms | The minister at The First Church of Springfield is Reverend Lovejoy [3]. He helps Ned Flanders make the teaching of evolution illegal [2]. |
| 5a87ef2f55429938390d3eb9 | 0.50 | 1.00 | 0.00 | 1.00 | 3570 ms | I don't know based on the provided documents. |
| 5a883afc5542994846c1ce48 | 1.00 | 0.33 | 1.00 | 1.00 | 3361 ms | The song "Renegade" was recorded by the band Styx [3]. Styx is from Chicago [5]. |
| 5a88b513554299206df2b338 | 0.50 | 1.00 | 0.00 | 1.00 | 6293 ms | I don't know based on the provided documents. |
| 5a88f9555542995153361214 | 0.50 | 1.00 | 0.00 | 1.00 | 3834 ms | The Jeep Cherokee was originally sold as a variant of the Jeep Wagoneer [1]. However, the provided documents do not state the years during which the Jeep Wagone |
| 5a89019a5542995153361259 | 0.50 | 1.00 | 1.00 | 1.00 | 4076 ms | The Mazda6 is produced by the Japanese car manufacturer Mazda [1]. |
| 5a899bf955429946c8d6e959 | 1.00 | 1.00 | 1.00 | 1.00 | 2745 ms | The New Orleans Pelicans player featured on the cover of NBA 2K16 is Anthony Davis [1]. He was drafted first overall in the 2012 NBA draft [2]. |
| 5a89ddf25542992e4fca83ff | 1.00 | 1.00 | 1.00 | 1.00 | 2338 ms | No, they do not have the same nationality. Lee Donghae is South Korean [2][3], whereas Dappy is English [1]. |
| 5a8a4b9955429930ff3c0d88 | 1.00 | 1.00 | 1.00 | 1.00 | 2863 ms | Arthur Freed wrote the lyrics to *Singin' in the Rain*, the production in which Gretel Scarlett starred as Kathy Selden [1][4]. |
| 5a8ae0ae55429950cd6afbc2 | 0.67 | 0.20 | 0.00 | 1.00 | 2560 ms | I don't know based on the provided documents. |
| 5a8b027e55429950cd6afc45 | 1.00 | 1.00 | 1.00 | 1.00 | 2268 ms | The perpetrator, Byron De La Beckwith, was convicted in 1994 for the assassination of Medgar Evers [1][5]. |
| 5a8b429f5542995d1e6f132c | 1.00 | 0.50 | 1.00 | 1.00 | 2974 ms | Stella Maxwell has been one of the Victoria's Secret Angels since 2015 [2]. |
| 5a8baf775542996e8ac889c8 | 0.00 | 0.00 | 0.00 | 1.00 | 2552 ms | I don't know based on the provided documents. |
| 5a8c5bff554299240d9c2139 | 0.50 | 0.50 | 0.00 | 1.00 | 2268 ms | I don't know based on the provided documents. |
| 5a8dd13055429917b4a5bcba | 1.00 | 0.50 | 0.00 | 1.00 | 2335 ms | I don't know based on the provided documents. |
| 5a8dd5f955429917b4a5bcc7 | 0.50 | 0.33 | 0.00 | 1.00 | 2229 ms | I don't know based on the provided documents. |
| 5a8efef05542997ba9cb3178 | 0.67 | 1.00 | 0.00 | 1.00 | 3613 ms | I don't know based on the provided documents. |
| 5a8f25d755429924144829ea | 1.00 | 0.50 | 1.00 | 1.00 | 2631 ms | Yes, both the Dutch Smoushond and the Sussex Spaniel are breeds of dogs [2][5]. |
| 5a90945755429933b8a2056c | 1.00 | 0.50 | 1.00 | 1.00 | 2143 ms | John Constantine Williams, Sr. was the cofounder of St. Petersburg, Florida [2]. St. Petersburg is located in Pinellas County, Florida [5]. |
| 5a90ad595542990a9849368b | 1.00 | 1.00 | 1.00 | 1.00 | 2129 ms | The headquarters of Darwin Airline are located at Lugano Airport [1]. Around 200,000 passengers use this airport each year [1]. |
| 5ab2a186554299295394677b | 1.00 | 1.00 | 1.00 | 1.00 | 3486 ms | The newspaper, the *Reading Post* (previously the *Reading Evening Post*), changed its name in 2009 [3]. Its title page featured the Maiwand Lion, a sculpture a |
| 5ab2da99554299194fa93544 | 1.00 | 1.00 | 1.00 | 1.00 | 2761 ms | During the Uruguayan War, the Colorado forces were allied with and openly supported by the Empire of Brazil [1][2]. They were also covertly aided by Argentina a |
| 5ab2f53d5542991669774157 | 1.00 | 1.00 | 1.00 | 1.00 | 2668 ms | Larry Mosley and his cousin Shane Mosley both compete in the welterweight division [1][3]. |
| 5ab31fea554299194fa9356a | 0.50 | 0.33 | 1.00 | 1.00 | 3576 ms | Jason Daunt formed the band Flaw, whose second major label album, *Endangered Species*, was released in 2004 [3]. |
| 5ab322b1554299194fa93570 | 1.00 | 1.00 | 1.00 | 1.00 | 3994 ms | The book features the magical English nanny, Mary Poppins [1]. |
| 5ab3c05d55429969a97a81aa | 0.50 | 0.20 | 0.00 | 1.00 | 3687 ms | I don't know based on the provided documents. |
| 5ab5279d5542996a3a96a03f | 0.50 | 1.00 | 0.00 | 1.00 | 2537 ms | I don't know based on the provided documents. |
| 5ab5e9865542992aa134a3db | 0.50 | 1.00 | 1.00 | 1.00 | 3420 ms | Mount Ida and Rhea are both associated with Greek mythology and pre-Greek myth centered on the mother goddess [1][3]. In these traditions, Mount Ida is connecte |
| 5ab6c94c554299710c8d1f5e | 0.50 | 1.00 | 0.00 | 1.00 | 5383 ms | I don't know based on the provided documents. |
| 5ab761d955429928e1fe3856 | 0.50 | 1.00 | 1.00 | 1.00 | 3199 ms | Jörg Leichtfried serves under Chancellor Christian Kern [1]. |
| 5ab7d6ec5542995dae37e9b4 | 0.50 | 1.00 | 0.00 | 1.00 | 2452 ms | I don't know based on the provided documents. |
| 5ab7e4dc5542995dae37e9df | 1.00 | 0.50 | 1.00 | 1.00 | 2216 ms | Armie Hammer voiced the character of Jackson Storm in *Cars 3* [3]. |
| 5ab7f1315542991d322237d1 | 0.50 | 1.00 | 0.00 | 1.00 | 3534 ms | I don't know based on the provided documents. |
| 5ab8ee035542991b5579f04b | 0.50 | 0.20 | 0.00 | 1.00 | 2897 ms | I don't know based on the provided documents. |
| 5ab900045542991b5579f0c0 | 0.50 | 0.50 | 0.00 | 1.00 | 2511 ms | I don't know based on the provided documents. |
| 5ab90fdd55429916710eb0fc | 1.00 | 1.00 | 1.00 | 1.00 | 3441 ms | The Whitney family was founded by John Whitney, who came from London, England, and settled in Watertown, Massachusetts in 1635 [1]. |
| 5ab9180b5542991b5579f0f3 | 1.00 | 1.00 | 1.00 | 1.00 | 2238 ms | Kim Jong-kook is from South Korea [3]. |
| 5ab930655542991b5579f12a | 1.00 | 1.00 | 1.00 | 1.00 | 2175 ms | Yes, both are involved in the film industry. Dziga Vertov was a Soviet documentary film and newsreel director as well as a cinema theorist [1]. Roger Donaldson  |
| 5ab95a63554299743d22eb06 | 1.00 | 0.50 | 1.00 | 1.00 | 2907 ms | Royler Gracie was a student of Rolls Gracie [4]. He also ran the Gracie Humaitá school in Rio de Janeiro for many years under his father Helio's direction [2]. |
| 5ab97c0255429970cfb8eb1f | 1.00 | 1.00 | 1.00 | 1.00 | 2421 ms | Mario Gómez and Javi Martínez both played for Bayern Munich [1][3]. |
| 5aba94e355429901930fa845 | 0.00 | 0.00 | 0.00 | 1.00 | 2166 ms | I don't know based on the provided documents. |
| 5aba9813554299232ef4a357 | 1.00 | 1.00 | 1.00 | 1.00 | 2543 ms | Yuen Woo-ping is a martial arts choreographer [1]. In contrast, Basil Dean was an English actor, writer, film producer/film director, and theatrical producer/di |
| 5abaf6865542996cc5e49f3c | 1.00 | 1.00 | 1.00 | 1.00 | 2087 ms | In the sitcom *The Lodge*, which is based on the Israeli series "North Star", Thomas Doherty played the role of Sean [1][3]. |
| 5abccb235542996583600497 | 1.00 | 1.00 | 1.00 | 1.00 | 2733 ms | The team coached by Mike Krzyzewski, who is nicknamed "Coach K," is the Duke Blue Devils men's basketball team [1][2]. The team plays its home games at Cameron  |
| 5abe0e4e55429976d4830a62 | 0.50 | 1.00 | 0.00 | 1.00 | 3867 ms | I don't know based on the provided documents. |
| 5abe7f695542993f32c2a12d | 1.00 | 1.00 | 0.00 | 1.00 | 2141 ms | I don't know based on the provided documents. |
| 5abff00c5542994516f45537 | 0.50 | 1.00 | 0.00 | 1.00 | 2806 ms | I don't know based on the provided documents. |
| 5abffda6554299012d1db55b | 1.00 | 0.50 | 1.00 | 1.00 | 2415 ms | Ewan Fenton spent thirteen seasons at Blackpool Football Club [2][3]. The main nickname of Blackpool F.C. is "the Seasiders" [3]. |
| 5ac002705542996f0d89cb05 | 1.00 | 0.50 | 1.00 | 1.00 | 1958 ms | Both Beitun and Wafangdian are categorized administratively as county-level cities [2][3]. |
| 5ac007cc5542996f0d89cb0b | 1.00 | 1.00 | 1.00 | 1.00 | 3000 ms | Charles Edward Stuart, also known as "Bonnie Prince Charlie" or the "Young Pretender," was attempting to regain the British throne for the exiled House of Stuar |
| 5ac06191554299294b218fab | 0.50 | 0.33 | 0.00 | 1.00 | 2738 ms | I don't know based on the provided documents. |
| 5ac0b6b15542996f0d89cc1e | 1.00 | 1.00 | 1.00 | 1.00 | 2731 ms | The character also known as Holger Danske is named Ogier the Dane (French: "Ogier le Danois" or archaically "Ogier de Danemarche") [1][3]. |
| 5ac258cc554299636651998e | 0.50 | 1.00 | 0.00 | 1.00 | 2822 ms | Based on the provided documents, the magazine contained contributions from Neneh Cherry, among others [1]. However, the documents do not identify which of the c |
| 5ac2ffea55429921a00ab0cc | 0.33 | 0.50 | 1.00 | 1.00 | 3301 ms | The mall located on the north side of Interstate 295 is situated near the junction with Interstate 95 [2]. It is also located just north of the Midland Mall (la |
| 5ac3af895542995ef918c1f0 | 1.00 | 0.50 | 1.00 | 1.00 | 2656 ms | Janne Kyttanen has had his work exhibited at the Stedelijk Museum [2]. Located in Amsterdam, Netherlands, the Stedelijk Museum Amsterdam is a museum for modern  |
| 5ac3bff15542995ef918c213 | 0.50 | 0.33 | 0.00 | 1.00 | 3858 ms | I don't know based on the provided documents. |
| 5ac3dc9e5542997ea680c950 | 0.50 | 1.00 | 1.00 | 1.00 | 2893 ms | Maria Radu is best known for winning the women's 3000 metres at the 1983 Summer Universiade [1]. |
| 5ac439005542995c82c4acf9 | 0.50 | 0.50 | 1.00 | 1.00 | 1881 ms | The 2006 Commonwealth Games, where Mmoloki Nogeng won a bronze medal, were held in Melbourne, Australia [2]. |
| 5adbf2805542994650320c15 | 1.00 | 1.00 | 1.00 | 1.00 | 2646 ms | William Vere Reeve King-Fane served as High Sheriff of Lincolnshire [1]. The office of the High Sheriff changes every March [4]. |
| 5adc02445542994650320c4e | 1.00 | 1.00 | 1.00 | 1.00 | 2239 ms | Ethel Winter worked with Jean Erdman [1], who was an avant-garde theater director [4]. |
| 5adc398755429947ff173912 | 1.00 | 1.00 | 1.00 | 1.00 | 3200 ms | *Nothoscordum* is native to more continents, as it is native to two continents: North and South America [1]. In contrast, *Callirhoe* is native only to North Am |
| 5add1d435542990d50227de8 | 0.50 | 1.00 | 0.00 | 1.00 | 3646 ms | I don't know based on the provided documents. |
| 5add3b035542997545bbbcce | 0.00 | 0.00 | 0.00 | 1.00 | 4136 ms | I don't know based on the provided documents. |
| 5addc2b75542997dc7907017 | 1.00 | 0.33 | 1.00 | 1.00 | 4046 ms | The Voyage is located at Holiday World & Splashin' Safari, which is divided into four sections [3][4]. These sections celebrate Christmas, Halloween, Thanksgivi |
| 5adde2475542997545bbbdc1 | 0.50 | 0.33 | 0.00 | 1.00 | 2445 ms | I don't know based on the provided documents. |
| 5adf734b5542995ec70e9016 | 1.00 | 1.00 | 1.00 | 1.00 | 4185 ms | Chelsea Handler appeared on the documentary series *Chelsea Does*, which was released on Netflix in January 2016 [2][3]. |
| 5adf9dc3554299025d62a2e6 | 1.00 | 0.33 | 1.00 | 1.00 | 2148 ms | The actress is Laura Osnes [3][5]. She received a Drama Desk Award for her role in Rodgers & Hammerstein's "Cinderella" and was featured on the cast album for t |
| 5adface25542995ec70e906c | 0.50 | 1.00 | 1.00 | 1.00 | 3209 ms | The bassist of that band is Sam Bettley [1]. |
| 5adfeeed55429925eb1afb44 | 1.00 | 1.00 | 1.00 | 1.00 | 3085 ms | Gus Poyet, whose management team includes Charlie Oatway, was born on 15 November 1967 [1][3]. |
| 5ae03cd855429924de1b7072 | 1.00 | 0.50 | 1.00 | 1.00 | 2610 ms | Yes, both Paul Éluard and Georges Bataille were from France, as both are identified as French [2][4]. |
| 5ae0575755429945ae95931f | 0.50 | 1.00 | 0.00 | 1.00 | 2370 ms | I don't know based on the provided documents. |
| 5ae083e855429924de1b70fb | 1.00 | 0.33 | 1.00 | 1.00 | 2761 ms | Dion Lewis won Super Bowl LI with the New England Patriots [4]. During the third quarter of that game, the Patriots trailed by as many as 25 points (28–3) [3]. |
| 5ae09ce855429924de1b7113 | 0.33 | 0.20 | 0.00 | 1.00 | 3044 ms | I don't know based on the provided documents. |
| 5ae0de1455429924de1b71b4 | 1.00 | 0.50 | 1.00 | 1.00 | 2606 ms | The creator of the Original House of Pies was also responsible for Orange Julius, an American chain of fruit drink beverage stores [2][3]. Its eponymous beverag |
| 5ae0fe8855429945ae959495 | 1.00 | 1.00 | 1.00 | 1.00 | 2231 ms | No. While Jürgen Melzer is an Austrian tennis player [1], Tom Gullikson was a professional tennis player from the United States [2]. |
| 5ae12a4b55429920d52342df | 0.33 | 1.00 | 0.00 | 1.00 | 3739 ms | I don't know based on the provided documents. |
| 5ae26fad554299495565da6f | 0.50 | 1.00 | 0.00 | 1.00 | 2361 ms | I don't know based on the provided documents. |
| 5ae3281a5542991a06ce9939 | 1.00 | 1.00 | 1.00 | 1.00 | 2120 ms | No, both are not American film directors. While Frank Lloyd was an American film director [1], Olivier Assayas is a French film director [4]. |
| 5ae377415542992e3233c40a | 1.00 | 1.00 | 1.00 | 1.00 | 2490 ms | Zane Grey was a dentist [1]. |
| 5ae46ebc5542995dadf24331 | 1.00 | 1.00 | 1.00 | 1.00 | 2677 ms | The Airbus A380 is a double-deck, wide-body, four-engine jet airliner manufactured by Airbus [1]. RedBoot is used in the entertainment systems on Airbus A380s [ |
| 5ae4903855429913cc2044a0 | 0.50 | 0.20 | 0.00 | 1.00 | 3568 ms | I don't know based on the provided documents. |
| 5ae54c085542992663a4f1c4 | 1.00 | 1.00 | 1.00 | 1.00 | 4700 ms | The Forests of Mara and Mondrem were home to red and fallow deer [1]. Areas sharing the red deer include most of Europe, the Caucasus Mountains, Asia Minor, Ira |
| 5ae5aba0554299546bf82f17 | 1.00 | 1.00 | 1.00 | 1.00 | 3672 ms | Tara Strong's major voice roles include the animated series *Teen Titans* and its spin-off *Teen Titans Go!* [3]. Both *Teen Titans* and *Teen Titans Go!* are A |
| 5ae5b301554299546bf82f2d | 1.00 | 1.00 | 1.00 | 1.00 | 2633 ms | The hormone that promotes sodium retention in the distal nephron is aldosterone [2]. Aldosterone is produced by the zona glomerulosa of the adrenal cortex in th |
| 5ae5d7b755429929b08079cd | 0.50 | 0.50 | 1.00 | 1.00 | 4475 ms | Wallace Fard Muhammad, a co-founder of the Nation of Islam, was last seen by Elijah Muhammad in 1933 when he took off in an airplane from the Detroit airport [2 |
| 5ae608f2554299546bf83026 | 0.50 | 0.20 | 0.00 | 1.00 | 2886 ms | I don't know based on the provided documents. |
| 5ae618325542996de7b71b56 | 1.00 | 1.00 | 1.00 | 1.00 | 2654 ms | Gerald Grosvenor, 6th Duke of Westminster was succeeded by his son, Hugh Grosvenor, 7th Duke of Westminster [1][2]. Hugh Grosvenor is estimated to be worth US$1 |
| 5ae6d3345542996d980e7c85 | 1.00 | 1.00 | 0.00 | 1.00 | 2819 ms | I don't know based on the provided documents. |
| 5ae731ae5542991bbc9761c1 | 0.50 | 1.00 | 0.00 | 1.00 | 2387 ms | I don't know based on the provided documents. |
| 5ae74fc45542997b22f6a6b4 | 0.50 | 1.00 | 1.00 | 1.00 | 2819 ms | Yi Guan's research helped prevent the outbreak of SARS [1], the full name of which is severe acute respiratory syndrome [5]. |
| 5ae819ac55429952e35eaa16 | 1.00 | 1.00 | 1.00 | 1.00 | 2761 ms | The episode "Marry Me a Little, Marry Me a Little More" originally aired on the National Broadcasting Company (NBC) [1]. It is an episode of the series *Will &  |
