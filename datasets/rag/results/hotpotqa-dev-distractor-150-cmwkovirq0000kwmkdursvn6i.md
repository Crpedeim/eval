# RAG eval — hotpotqa-dev-distractor-150 (run cmwkovirq0000kwmkdursvn6i)

- Date: 2026-11-17T12:49:09.830Z
- Models: generator `gemini-3.8-flash`, embedder `gemini-embedding-001`, judge `gemini-3.8-flash`
- Retrieval: vector
- k = 5; questions: 150 (150 answered, 0 failed)
- Wall clock from enqueue to all items + judges settled: 961s

| Metric | Value |
|---|---|
| Recall@5 | 0.974 |
| Hit rate@5 | 1.000 |
| MRR@5 | 0.972 |
| rag-answer-relevance (mean score / pass rate @0.7) | 0.913 / 0.913 (150 judged, 0 errored) |
| rag-faithfulness (mean score / pass rate @0.7) | 0.997 / 0.993 (150 judged, 0 errored) |
| Answers with ≥1 citation | 0.920 |
| Citation precision (cited chunk is labelled relevant) | 0.952 |
| "I don't know" answers | 12 |
| Request latency p50 / p95 | 2693 / 3758 ms |
| retrieve span p50 / p95 | 643 / 972 ms |
| generate span p50 / p95 | 2031 / 3065 ms |
| Generate prompt / output tokens (mean) | 820 / 56.0 |
| Generate tokens/sec (median / mean / aggregate) | 20.7 / 24.3 / 26.2 |
| Cost per request (retrieve + generate, mean) | $0.000828 |
| Total cost of answered requests | $0.124256 |
| Judge cost per answer (mean, 300 judge calls costed) | $0.003557 |
| **Cost per eval answer incl. judges (mean)** | $0.004385 |
| Judge tokens in / out (total, out incl. thinking) | 316516 / 78980 |
| Total cost incl. judges | $0.657818 |

## Per question

| id | recall | RR | rag-answer-relevance | rag-faithfulness | latency | answer |
|---|---|---|---|---|---|---|
| 5a7133fa5542994082a3e660 | 1.00 | 1.00 | 1.00 | 1.00 | 2826 ms | The current manager of Chinese club Tianjin Quanjian is Fabio Cannavaro [1][2]. He is the older brother of Paolo Cannavaro [2]. |
| 5a727e1b5542991f9a20c497 | 1.00 | 1.00 | 1.00 | 1.00 | 2735 ms | The song is "Shake It Off" [1][2]. It was written by Taylor Swift alongside Max Martin and Shellback, and its optimistic lyrical message was compared to that of |
| 5a728fbd5542992359bc30f8 | 1.00 | 1.00 | 1.00 | 1.00 | 3035 ms | Harlow Cuadra and Joseph Kerekes were convicted of murdering Bryan Kocis, the director of *Schoolboy Crush* [1][2]. |
| 5a72e28f5542992359bc31ba | 1.00 | 0.50 | 1.00 | 1.00 | 2536 ms | The director at Pzena Investment Management, Joel Greenblatt, outlined the investment technique known as "magic formula investing" [2][3]. This technique utiliz |
| 5a7324205542994cef4bc478 | 1.00 | 1.00 | 1.00 | 1.00 | 2609 ms | Rumi was a 13th-century Persian poet [1][3]. In contrast, Farouk El-Baz is an Egyptian American space scientist who worked with NASA [2]. Therefore, Rumi is the |
| 5a73cf5e55429978a71e909f | 0.33 | 1.00 | 1.00 | 1.00 | 2731 ms | Mike Leach is the head coach of the Washington State Cougars football team [1]. |
| 5a75176a5542993748c897b6 | 1.00 | 1.00 | 1.00 | 1.00 | 2688 ms | The 1994 British romantic comedy film that featured the song "Love Is All Around" is *Four Weddings and a Funeral* [1][2]. |
| 5a7543d555429916b01642ce | 1.00 | 1.00 | 1.00 | 1.00 | 2430 ms | Flula Borg was born more recently, having been born on March 28, 1982 [1]. In comparison, Dirk Nowitzki was born earlier, on June 19, 1978 [2]. |
| 5a7555215542996c70cfaee1 | 1.00 | 1.00 | 1.00 | 1.00 | 3219 ms | "Hey Pa! There's a Goat on the Roof" came to market first, having been issued in 1966 [1]. In contrast, "Poleconomy" was first published in 1980 [2]. |
| 5a7568175542992d0ec05f88 | 1.00 | 1.00 | 1.00 | 1.00 | 2423 ms | The film is *Serial (Bad) Weddings* [1][2]. It is a French comedy directed by Philippe de Chauveron and features Julia Piaton as Odile [1][2]. |
| 5a762a645542992d0ec0603d | 1.00 | 1.00 | 1.00 | 1.00 | 2502 ms | The Hyundai Stellar was produced by the Hyundai Motor Company [1]. The Hyundai Motor Company is headquartered in Seoul, South Korea [2]. |
| 5a7631cd5542994ccc91870c | 1.00 | 1.00 | 1.00 | 1.00 | 2652 ms | Jeanne Marie Beaumont directed The Frost Place Advanced Seminar from 2007 to 2010 [1]. The Frost Place is located at Robert Frost's former home in Franconia, Ne |
| 5a76dc2d55429972597f13eb | 1.00 | 1.00 | 1.00 | 1.00 | 2530 ms | The song included on the 59th edition of *Now That's What I Call Music!* is "Cheap Thrills" [2]. It was written and recorded by Australian recording artist Sia  |
| 5a7796e05542992a6e59df0f | 1.00 | 1.00 | 1.00 | 1.00 | 3435 ms | The theme park served by the Huis Ten Bosch train service recreates the Netherlands [1][2]. |
| 5a77a7565542995d83181249 | 1.00 | 1.00 | 1.00 | 1.00 | 3005 ms | Murdock MacQuarrie was born earlier, having been born on 25 August 1878 [2]. In comparison, Fabián Bielinsky was born on 3 February 1959 [1]. |
| 5a77aa095542995d83181260 | 1.00 | 1.00 | 1.00 | 1.00 | 3643 ms | The aircraft is the General Dynamics F-16 Fighting Falcon, of which over 4,500 have been built [1]. It is powered by the Pratt & Whitney F100 afterburning turbo |
| 5a77ba6c55429967ab10524c | 0.67 | 1.00 | 0.00 | 1.00 | 4204 ms | I don't know based on the provided documents. |
| 5a77c15f5542997042120b1c | 0.50 | 1.00 | 0.00 | 1.00 | 1990 ms | I don't know based on the provided documents. |
| 5a78b386554299148911f949 | 1.00 | 0.50 | 0.00 | 1.00 | 2897 ms | I don't know based on the provided documents. |
| 5a78ce79554299029c4b5ea1 | 1.00 | 1.00 | 1.00 | 1.00 | 2942 ms | Jacques Coghen is a direct ancestor of Philippe of Belgium [1]. King Philippe is married to Queen Mathilde [2]. Therefore, Jacques Coghen is a direct ancestor t |
| 5a78f1b555429970f5fffde9 | 0.50 | 1.00 | 0.00 | 1.00 | 5040 ms | I don't know based on the provided documents. |
| 5a78f8e555429970f5fffe01 | 1.00 | 1.00 | 1.00 | 1.00 | 2485 ms | The British diver featured in *Splash!* is Tom Daley [2]. He specialises in the 10-metre platform event [1]. |
| 5a79186f55429907847277af | 1.00 | 1.00 | 1.00 | 1.00 | 2170 ms | The stadium named after Rodney Cline Carew, known as the Rod Carew Stadium (or Estadio Nacional de Panamá), is located in Panama City, Panama [1][2]. |
| 5a7943ea5542994bb9456fd3 | 1.00 | 1.00 | 1.00 | 1.00 | 2394 ms | Planets of the Solar System are in heliocentric orbits around the barycenter of the Solar System near the Sun [1]. Before entering a heliocentric orbit, Pioneer |
| 5a7a5aea5542996c55b2dd6f | 1.00 | 1.00 | 1.00 | 1.00 | 3038 ms | The Selun is located in the canton of St. Gallen, which is a canton of Switzerland [1][4]. Therefore, it is located in Switzerland [1][4]. |
| 5a7b895c5542997c3ec97206 | 1.00 | 1.00 | 1.00 | 1.00 | 3267 ms | David S. Cohen (David X. Cohen) wrote the Simpsons' episode "Das Bus", which was narrated by James Earl Jones [1][2]. Cohen served as the head writer and execut |
| 5a7c3178554299683c1c62e1 | 1.00 | 1.00 | 1.00 | 1.00 | 2354 ms | FORTE was co-developed and launched by Los Alamos National Laboratory, which is located a short distance northwest of Santa Fe, New Mexico [1][2]. During World  |
| 5a7c96e55542990527d554d9 | 1.00 | 1.00 | 1.00 | 1.00 | 3071 ms | Pre's Trail was named after Steve Prefontaine [1]. He died in an automobile accident in Eugene, Oregon, in May 1975 at the age of 24 [2]. |
| 5a7c9d2e55429935c91b5261 | 1.00 | 1.00 | 1.00 | 1.00 | 3387 ms | The horror film *Ghostkeeper* was inspired by the Windigo (Wendigo) legend of North America [1]. This legend lends its name to the modern medical term Wendigo p |
| 5a7cb5f0554299452d57b9b5 | 1.00 | 1.00 | 1.00 | 1.00 | 2952 ms | In their book *The Future of the Race*, Henry Louis Gates and Cornel West criticized W. E. B. Du Bois' essay "The Talented Tenth" [1]. That essay was first publ |
| 5a7cdc1b55429907fabef04d | 1.00 | 1.00 | 1.00 | 1.00 | 2611 ms | *Getting Married in Buffalo Jump* stars actor Paul Gross [1], who was born in Calgary, Alberta [5]. |
| 5a7cef6955429909bec768ad | 1.00 | 1.00 | 1.00 | 1.00 | 3175 ms | The municipality is Crested Butte, Colorado [1][2]. It is now called "the last great Colorado ski town" and is located east of the Lucky Jack mine in Gunnison C |
| 5a7d1d825542995ed0d165f5 | 0.50 | 1.00 | 0.00 | 1.00 | 2486 ms | I don't know based on the provided documents. |
| 5a7d26fd554299452d57bb2a | 1.00 | 1.00 | 1.00 | 1.00 | 2753 ms | The film *The Ghost and the Darkness* is a fictionalized account of the Tsavo Man-Eaters [2]. The significance of this pair of lions was their unusual behavior, |
| 5a7d54165542995f4f402256 | 1.00 | 1.00 | 1.00 | 1.00 | 3451 ms | Dirleton Castle borders the south side of Yellowcraig (also known as Yellowcraigs or Broad Sands Bay) [1][2]. |
| 5a7de14a5542991319bc93fc | 1.00 | 1.00 | 1.00 | 1.00 | 2345 ms | The neighborhood Plainview is located in Jeffersontown, Kentucky [2]. Jeffersontown is a home rule-class city that had a population of 26,595 at the 2010 U.S. c |
| 5a7e19e655429965cec5ea58 | 1.00 | 1.00 | 0.00 | 1.00 | 3835 ms | I don't know based on the provided documents. |
| 5a7e1a2955429965cec5ea5d | 1.00 | 1.00 | 1.00 | 1.00 | 2544 ms | The Cinematic Orchestra is signed to Ninja Tune, which is based in London [1][2]. |
| 5a7e3117554299495941991b | 1.00 | 1.00 | 0.00 | 1.00 | 4893 ms | I don't know based on the provided documents. |
| 5a7f0c4b5542993067513600 | 1.00 | 1.00 | 1.00 | 1.00 | 2545 ms | The nickname "Buffalo Soldiers" was given to the troops by Native American tribes they fought in the Indian Wars [2][4]. Thomas Shaw, who won the Medal of Honor |
| 5a7f650755429969796c1a2c | 1.00 | 1.00 | 1.00 | 1.00 | 2425 ms | As the Italian agent of Schott Music since the 1950s, ESZ has also represented Igor Stravinsky and Carl Orff [1]. |
| 5a7f9cb55542995d8a8ddec1 | 1.00 | 1.00 | 1.00 | 1.00 | 2547 ms | Both Franz Ferdinand and Sunrise Avenue were formed in 2002 [1][2]. |
| 5a7faa215542995d8a8ddee8 | 1.00 | 1.00 | 1.00 | 1.00 | 2439 ms | The Middleton Grange Shopping Centre was opened in 1970 by Princess Anne [1]. Princess Anne's mother is Queen Elizabeth II [2]. |
| 5a8078d85542995d8a8ddf78 | 1.00 | 1.00 | 1.00 | 1.00 | 2190 ms | Kill Hannah is from Chicago, having formed there in 1993 [2][3]. In contrast, Louis XIV is from San Diego, California [1]. |
| 5a808f3f5542992097ad2ffd | 1.00 | 1.00 | 1.00 | 1.00 | 2714 ms | The Columbia River Subdivision was originally built as part of James J. Hill's Great Northern Railway transcontinental railway line [1]. Today, it is operated b |
| 5a81346055429926c1cdad13 | 1.00 | 1.00 | 1.00 | 1.00 | 4185 ms | The organization is the Fundamentalist Church of Jesus Christ of Latter-Day Saints (FLDS Church) [1][2]. Its president, Warren Jeffs, was convicted of two felon |
| 5a81ff62554299676cceb1c4 | 1.00 | 1.00 | 0.00 | 1.00 | 2178 ms | I don't know based on the provided documents. |
| 5a820cb355429903bc27ba2f | 1.00 | 1.00 | 1.00 | 1.00 | 2120 ms | Reimar Horten helped initially design the Gotha Go 229 alongside Walter Horten [2]. He later died on 14 March 1994 in Villa General Belgrano, Argentina [1]. |
| 5a8220db5542995ce29dccc1 | 1.00 | 1.00 | 1.00 | 1.00 | 2697 ms | Rose Mary Woods was Richard Nixon's secretary from his days in Congress in 1951 through the end of his political career [1]. In contrast, H. R. Haldeman served  |
| 5a8257fa55429940e5e1a866 | 1.00 | 1.00 | 1.00 | 1.00 | 3110 ms | The most famous song of Liliʻuokalani, the last monarch of Hawaii, was "Aloha ʻOe" ("Farewell to Thee") [1][2]. |
| 5a8303c255429954d2e2ec01 | 1.00 | 0.50 | 1.00 | 1.00 | 3175 ms | Based on the provided documents, vehicles built on the platform used for police and fleet applications under the Plymouth Fury nameplate were effectively replac |
| 5a8319b255429940e5e1a960 | 1.00 | 1.00 | 1.00 | 1.00 | 2831 ms | Danny Elfman composed the theme music in 1989 for the animated television series *The Simpsons* [1]. The theme's current arrangement was created by Alf Clausen, |
| 5a8327fd5542990548d0b1a3 | 1.00 | 1.00 | 1.00 | 1.00 | 3700 ms | Forest Hill, Texas is a suburb of Fort Worth, which is the fifth-largest city in the state of Texas [1][2]. |
| 5a84a8ce5542997175ce1f1c | 1.00 | 1.00 | 1.00 | 1.00 | 2473 ms | The sixth Pharaoh of the Eighteenth Dynasty was Thutmose III [1]. The Ancient Egyptian official Khonsu served as the First Prophet of Menkheperre (Thutmose III) |
| 5a85e2775542994775f60680 | 1.00 | 1.00 | 1.00 | 1.00 | 2264 ms | The film *Just Before I Go* stars actress Elisha Cuthbert [1]. In the series "24", Cuthbert played the character Kim Bauer [2]. |
| 5a85fb5e5542994775f606df | 1.00 | 1.00 | 1.00 | 1.00 | 2163 ms | The Calabrian black squirrel is endemic to regions in the south of the Italian Peninsula [1]. The shape of the Italian Peninsula gives it the nickname "lo Stiva |
| 5a8662da5542991e7718162f | 1.00 | 1.00 | 1.00 | 1.00 | 2298 ms | Max Carl plays the guitar [1]. Denis Bélanger is a vocalist and lyricist [2]. |
| 5a872c3f5542994775f607a8 | 1.00 | 1.00 | 1.00 | 1.00 | 2340 ms | EOG Resources, Inc. is an American petroleum and natural gas exploration company [1]. In contrast, General Mills, Inc. is an American manufacturer and marketer  |
| 5a87ab9b5542996e4f3088c2 | 1.00 | 0.50 | 1.00 | 1.00 | 2251 ms | Tecumseh became the primary leader of a large, multi-tribal confederacy in the early years of the nineteenth century [2]. |
| 5a87bd4e5542996432c57279 | 1.00 | 1.00 | 1.00 | 1.00 | 3202 ms | The minister at The First Church of Springfield, Reverend Lovejoy, helps Ned Flanders [1][2]. Together, they spread the belief of creationism in Springfield, wh |
| 5a87ef2f55429938390d3eb9 | 1.00 | 1.00 | 1.00 | 0.50 | 2907 ms | Aberdeen Regional Airport is located in Aberdeen, South Dakota [1], while Valley International Airport is located in Harlingen, Texas [2]. Therefore, Aberdeen R |
| 5a883afc5542994846c1ce48 | 1.00 | 1.00 | 1.00 | 1.00 | 3022 ms | The band that recorded "Renegade" is Styx [1], which is from Chicago [2]. |
| 5a88b513554299206df2b338 | 1.00 | 1.00 | 1.00 | 1.00 | 2013 ms | Both Regency Road and Klemzig are located in the city of Adelaide, in the state of South Australia [1][3]. |
| 5a88f9555542995153361214 | 1.00 | 1.00 | 1.00 | 1.00 | 2811 ms | The Jeep Cherokee was originally sold as a variant of the Jeep Wagoneer [1]. The Jeep Wagoneer was produced from 1963 to 1991 [4]. |
| 5a89019a5542995153361259 | 0.50 | 1.00 | 1.00 | 1.00 | 3038 ms | The Mazda6 is produced by the Japanese car manufacturer Mazda [1]. |
| 5a899bf955429946c8d6e959 | 1.00 | 1.00 | 1.00 | 1.00 | 2731 ms | The New Orleans Pelicans player featured on the cover of NBA 2K16 is Anthony Davis [2]. Davis was drafted first overall in the 2012 NBA draft [1]. |
| 5a89ddf25542992e4fca83ff | 1.00 | 1.00 | 1.00 | 1.00 | 2482 ms | No, they do not have the same nationality. Lee Donghae is South Korean [1], whereas Dappy is English [2]. |
| 5a8a4b9955429930ff3c0d88 | 1.00 | 1.00 | 1.00 | 1.00 | 2657 ms | Gretel Scarlett starred as Kathy Selden in the 2016/2017 Australian production of "Singin' in the Rain" [1]. The lyrics for the musical "Singin' in the Rain" we |
| 5a8ae0ae55429950cd6afbc2 | 1.00 | 1.00 | 1.00 | 1.00 | 2458 ms | Aeroflot was a Soviet airline monopoly that was dissolved in the early 1990s [5]. It operates mainly from its hub at Sheremetyevo International Airport [1][2]. |
| 5a8b027e55429950cd6afc45 | 1.00 | 1.00 | 1.00 | 1.00 | 3106 ms | The perpetrator of the crime, Byron De La Beckwith, was convicted in 1994 [1][2]. |
| 5a8b429f5542995d1e6f132c | 1.00 | 1.00 | 1.00 | 1.00 | 2350 ms | Stella Maxwell has been one of the Victoria's Secret Angels since 2015 [4]. She was also featured in the Victoria's Secret Fashion Show in 2015 [2]. |
| 5a8baf775542996e8ac889c8 | 0.50 | 1.00 | 0.00 | 1.00 | 2589 ms | I don't know based on the provided documents. |
| 5a8c5bff554299240d9c2139 | 1.00 | 1.00 | 1.00 | 1.00 | 2661 ms | The Michigan State Spartans represented the Big Ten Conference in the 1993 Liberty Bowl [1]. As of 2016, the Big Ten Conference consists of 14 members [3]. |
| 5a8dd13055429917b4a5bcba | 1.00 | 1.00 | 0.00 | 1.00 | 2571 ms | The provided documents do not name a single film studio that produced both films; *The Computer Wore Tennis Shoes* was produced by Walt Disney Productions [1],  |
| 5a8dd5f955429917b4a5bcc7 | 1.00 | 1.00 | 1.00 | 1.00 | 2290 ms | The 1998 Toyota Grand Prix of Long Beach was won by Alex Zanardi [1]. In addition to racing, he is a paracyclist [2]. |
| 5a8efef05542997ba9cb3178 | 0.67 | 1.00 | 0.00 | 1.00 | 2633 ms | I don't know based on the provided documents. |
| 5a8f25d755429924144829ea | 1.00 | 1.00 | 1.00 | 1.00 | 2698 ms | Yes, both are dog breeds. The Sussex Spaniel is a breed of dog developed in southern England [1], and the Dutch Smoushond is a small breed of dog originating fr |
| 5a90945755429933b8a2056c | 1.00 | 1.00 | 1.00 | 1.00 | 2715 ms | John Constantine Williams, Sr. was the cofounder of St. Petersburg, Florida [1]. St. Petersburg is located in Pinellas County, Florida [3]. |
| 5a90ad595542990a9849368b | 1.00 | 1.00 | 1.00 | 1.00 | 2700 ms | The headquarters of Darwin Airline are located at Lugano Airport [1]. Around 200,000 passengers use this airport each year [1]. |
| 5ab2a186554299295394677b | 1.00 | 1.00 | 1.00 | 1.00 | 2608 ms | The *Reading Post*, which featured the Maiwand Lion sculpture and war memorial on its title page, changed its name from the *Reading Evening Post* in 2009 [1][2 |
| 5ab2da99554299194fa93544 | 1.00 | 1.00 | 1.00 | 1.00 | 3695 ms | In the Uruguayan War, the Colorado forces were allied with and openly supported by the Empire of Brazil [1][3]. They were also covertly aided by Argentina, whos |
| 5ab2f53d5542991669774157 | 1.00 | 1.00 | 1.00 | 1.00 | 2393 ms | Larry Mosley and his cousin Shane Mosley both compete in the welterweight division [1][2]. |
| 5ab31fea554299194fa9356a | 1.00 | 1.00 | 1.00 | 1.00 | 2674 ms | The band formed by Jason Daunt is Flaw [1]. Their second studio album, *Endangered Species*, was released on May 4, 2004 [1][2]. |
| 5ab322b1554299194fa93570 | 1.00 | 1.00 | 1.00 | 1.00 | 3142 ms | The third book and last novel in P.L. Travers's "Mary Poppins" series features the magical English nanny Mary Poppins [1]. |
| 5ab3c05d55429969a97a81aa | 1.00 | 1.00 | 1.00 | 1.00 | 3008 ms | The author of *Negotiating with the Dead* is Margaret Atwood [1]. She has been shortlisted for the Booker Prize five times [5]. |
| 5ab5279d5542996a3a96a03f | 1.00 | 1.00 | 1.00 | 1.00 | 3628 ms | Mary Caroline "Myrtle" Page Fillmore, the female co-founder of Unity, was born on August 6, 1845 [1][2]. |
| 5ab5e9865542992aa134a3db | 1.00 | 1.00 | 1.00 | 1.00 | 3550 ms | Mount Ida and Rhea are both rooted in Greek mythology [1][3]. In these mythic traditions, they are connected to beliefs surrounding the mother goddess, with Mou |
| 5ab6c94c554299710c8d1f5e | 1.00 | 1.00 | 1.00 | 1.00 | 3169 ms | The New York City–based hip-hop musical group is the Wu-Tang Clan, of which Darryl Hill (known by his stage name Cappadonna) is a member [1][3]. |
| 5ab761d955429928e1fe3856 | 1.00 | 1.00 | 1.00 | 1.00 | 2098 ms | Jörg Leichtfried serves under Chancellor Christian Kern [1]. |
| 5ab7d6ec5542995dae37e9b4 | 1.00 | 1.00 | 1.00 | 1.00 | 2864 ms | Bonifacio High Street is owned by Ayala Malls [1]. Ayala Malls was founded in 1988 [2]. |
| 5ab7e4dc5542995dae37e9df | 1.00 | 1.00 | 1.00 | 1.00 | 2066 ms | Armie Hammer voiced the character Jackson Storm in *Cars 3* [2]. |
| 5ab7f1315542991d322237d1 | 1.00 | 1.00 | 1.00 | 1.00 | 2306 ms | "Look At Us Now" is a song by Lost Kings [1]. The DJ duo is based in Los Angeles [2]. |
| 5ab8ee035542991b5579f04b | 1.00 | 1.00 | 1.00 | 1.00 | 2294 ms | Yes, Hot Rod is a monthly American car magazine [2], and The Memory of Our People is a magazine published in Rosario, Argentina [1]. |
| 5ab900045542991b5579f0c0 | 1.00 | 1.00 | 1.00 | 1.00 | 2568 ms | The first US performance of "Libuše" was hosted at Carnegie Hall [1]. Carnegie Hall is located at 881 Seventh Avenue, occupying the east side of Seventh Avenue  |
| 5ab90fdd55429916710eb0fc | 1.00 | 1.00 | 1.00 | 1.00 | 2554 ms | The Whitney family was founded by John Whitney, who originated from London, England and came to Watertown, Massachusetts in 1635 [1]. |
| 5ab9180b5542991b5579f0f3 | 1.00 | 1.00 | 1.00 | 1.00 | 2623 ms | Kim Jong-kook is from South Korea [2]. |
| 5ab930655542991b5579f12a | 1.00 | 1.00 | 1.00 | 1.00 | 2187 ms | Yes, both are involved in the film industry. Dziga Vertov was a Soviet pioneer documentary film and newsreel director as well as a cinema theorist [1]. Roger Do |
| 5ab95a63554299743d22eb06 | 1.00 | 0.50 | 1.00 | 1.00 | 3226 ms | Royler Gracie was a student of Rolls Gracie [3] and ran the Gracie Humaitá school in Rio de Janeiro for many years under his father Helio's direction [2]. |
| 5ab97c0255429970cfb8eb1f | 1.00 | 1.00 | 1.00 | 1.00 | 2668 ms | Mario Gómez and Javi Martínez both played for Bayern Munich [1][2]. |
| 5aba94e355429901930fa845 | 1.00 | 1.00 | 1.00 | 1.00 | 2868 ms | Jonathan Groff, who was born on March 26, 1985, was 30 years old when he performed in the 2015 musical *Hamilton* [1][2][3]. The musical was written by Lin-Manu |
| 5aba9813554299232ef4a357 | 1.00 | 1.00 | 1.00 | 1.00 | 2816 ms | Yuen Woo-ping is a martial arts choreographer [1]. Basil Dean was an actor, writer, and film and theatrical producer and director [2]. |
| 5abaf6865542996cc5e49f3c | 1.00 | 1.00 | 1.00 | 1.00 | 2438 ms | Thomas Doherty played the role of Sean in the British musical drama sitcom *The Lodge*, which is based on the Israeli series "North Star" [1][2]. |
| 5abccb235542996583600497 | 1.00 | 1.00 | 1.00 | 1.00 | 2684 ms | Mike Krzyzewski, who is nicknamed "Coach K", serves as the head men's basketball coach at Duke University [1]. The Duke Blue Devils play their home games at Cam |
| 5abe0e4e55429976d4830a62 | 1.00 | 1.00 | 1.00 | 1.00 | 2358 ms | Tim O'Kelly was cast in the film "Targets" due to his similarity in appearance to killer Charles Whitman [1]. Whitman was infamous under the nickname the "Texas |
| 5abe7f695542993f32c2a12d | 1.00 | 1.00 | 0.00 | 1.00 | 2224 ms | I don't know based on the provided documents. |
| 5abff00c5542994516f45537 | 1.00 | 1.00 | 1.00 | 1.00 | 2025 ms | Both *Baghdad ER* and *Olympia* are linked by the documentary film genre [1][2]. |
| 5abffda6554299012d1db55b | 1.00 | 1.00 | 1.00 | 1.00 | 3167 ms | The club where Ewan Fenton spent thirteen seasons is Blackpool Football Club [1][2]. The club's main nickname is "the Seasiders" [2]. |
| 5ac002705542996f0d89cb05 | 1.00 | 1.00 | 1.00 | 1.00 | 2879 ms | Both Beitun, Xinjiang and Wafangdian are categorized administratively as county-level cities [1][2]. |
| 5ac007cc5542996f0d89cb0b | 1.00 | 1.00 | 1.00 | 1.00 | 2971 ms | Charles Edward Stuart, also known as "Bonnie Prince Charlie" or the "Young Pretender," was attempting to regain the British throne for the exiled House of Stuar |
| 5ac06191554299294b218fab | 1.00 | 1.00 | 1.00 | 1.00 | 2290 ms | Phoebe Ruguru's 2014 winning film "Saidia" was shot entirely on an iPhone 4s [1]. The iPhone 4s is a smartphone marketed by Apple Inc. [5]. |
| 5ac0b6b15542996f0d89cc1e | 1.00 | 1.00 | 1.00 | 1.00 | 2309 ms | The character also known as Holger Danske is named Ogier the Dane [1][2]. In French, he is known as "Ogier le Danois" or archaically as "Ogier de Danemarche" [1 |
| 5ac258cc554299636651998e | 1.00 | 1.00 | 1.00 | 1.00 | 2486 ms | The Swedish singer-songwriter who made contributions to the magazine is Neneh Cherry [1][2]. |
| 5ac2ffea55429921a00ab0cc | 1.00 | 1.00 | 1.00 | 1.00 | 2326 ms | Jordan's Furniture has a location in the Warwick Mall [2]. This mall is located on the north side of Interstate 295 near the junction with Interstate 95 [1]. |
| 5ac3af895542995ef918c1f0 | 1.00 | 1.00 | 1.00 | 1.00 | 2234 ms | Janne Kyttanen has had his work exhibited at the Stedelijk Museum, which is a museum for modern art located in Amsterdam [1][2]. |
| 5ac3bff15542995ef918c213 | 1.00 | 1.00 | 1.00 | 1.00 | 3350 ms | Alexander S. Wadsworth served in the War of 1812 [2]. That conflict was fought between the United States and the United Kingdom, along with their respective all |
| 5ac3dc9e5542997ea680c950 | 1.00 | 1.00 | 1.00 | 1.00 | 3805 ms | Maria Radu is best known for winning the women's 3000 metres at the 1983 Summer Universiade, which was held in Edmonton, Alberta, Canada [1][2]. This event is a |
| 5ac439005542995c82c4acf9 | 1.00 | 1.00 | 1.00 | 1.00 | 3274 ms | The 2006 Commonwealth Games, where Mmoloki Nogeng won a bronze medal, were held in Melbourne, Australia [1]. The boxing events specifically took place at the Me |
| 5adbf2805542994650320c15 | 1.00 | 1.00 | 1.00 | 1.00 | 4778 ms | William Vere Reeve King-Fane served as the High Sheriff of Lincolnshire [1]. The office of the High Sheriff changes every March [2]. |
| 5adc02445542994650320c4e | 1.00 | 1.00 | 1.00 | 1.00 | 2393 ms | Ethel Winter worked with Jean Erdman [1], who was an avant-garde theater director [2]. |
| 5adc398755429947ff173912 | 1.00 | 1.00 | 1.00 | 1.00 | 2296 ms | *Nothoscordum* is native to more continents [1][2]. It is native to two continents—North and South America—while *Callirhoe* is native only to North America [1] |
| 5add1d435542990d50227de8 | 1.00 | 1.00 | 1.00 | 1.00 | 3282 ms | The *Glomar Challenger* was designed by Global Marine Inc., which is now Transocean Inc. [1]. Transocean is based in Vernier, Switzerland [3]. |
| 5add3b035542997545bbbcce | 1.00 | 1.00 | 1.00 | 1.00 | 2805 ms | "The Gate" is the lead single from Björk's album *Utopia* [1]. The album was scheduled for release in November 2017 [2]. |
| 5addc2b75542997dc7907017 | 1.00 | 1.00 | 1.00 | 1.00 | 2105 ms | The Voyage is located at the theme park Holiday World & Splashin' Safari [1][2]. This theme park is divided into four sections [2]. |
| 5adde2475542997545bbbdc1 | 1.00 | 1.00 | 1.00 | 1.00 | 2830 ms | Justin Verlander was born on February 20, 1983 [4]. He played for the Old Dominion Monarchs baseball team and has played in the World Series [1]. |
| 5adf734b5542995ec70e9016 | 1.00 | 0.50 | 1.00 | 1.00 | 2717 ms | Chelsea Handler appeared on the documentary series *Chelsea Does*, which was released on Netflix on January 22, 2016 [1][3]. |
| 5adf9dc3554299025d62a2e6 | 1.00 | 1.00 | 1.00 | 1.00 | 3198 ms | The actress is Laura Osnes [1][2]. She was featured on the cast album for the 2007 Broadway production of "Grease" and later received a Drama Desk Award for her |
| 5adface25542995ec70e906c | 1.00 | 1.00 | 1.00 | 1.00 | 2354 ms | The bassist of the band Asking Alexandria is Sam Bettley [1][2]. |
| 5adfeeed55429925eb1afb44 | 1.00 | 1.00 | 1.00 | 1.00 | 3322 ms | The Uruguayan former footballer whose management team includes Charlie Oatway is Gus Poyet [1][2]. He was born on 15 November 1967 [2]. |
| 5ae03cd855429924de1b7072 | 1.00 | 1.00 | 1.00 | 1.00 | 2451 ms | Yes, Paul Éluard and Georges Bataille were from the same country, as both were French [1][2]. |
| 5ae0575755429945ae95931f | 1.00 | 1.00 | 1.00 | 1.00 | 3256 ms | The 1958 Pro Bowl was played at the Los Angeles Memorial Coliseum [2]. That stadium serves as the home to the University of Southern California (USC) [1]. |
| 5ae083e855429924de1b70fb | 1.00 | 0.50 | 1.00 | 1.00 | 2531 ms | Dion Lewis won Super Bowl LI with the New England Patriots [2]. During the third quarter of that game, the Patriots trailed by as many as 25 points (28–3) befor |
| 5ae09ce855429924de1b7113 | 1.00 | 0.33 | 1.00 | 1.00 | 3686 ms | The song "Magic Bus," written by English multi-instrumentalist Pete Townshend, reached number 25 in the United States [3][4]. |
| 5ae0de1455429924de1b71b4 | 1.00 | 1.00 | 1.00 | 1.00 | 2496 ms | The American restaurant chain was started by Al Lapin Jr., who was also responsible for Orange Julius, an American chain of fruit drink beverage stores [1][2].  |
| 5ae0fe8855429945ae959495 | 1.00 | 1.00 | 1.00 | 1.00 | 2378 ms | No, they were not both Austrian. While Jürgen Melzer is an Austrian tennis player [1], Tom Gullikson is a former professional tennis player from the United Stat |
| 5ae12a4b55429920d52342df | 1.00 | 1.00 | 1.00 | 1.00 | 3213 ms | Baraki Barak District is situated in the western part of Logar Province [1]. The capital of Logar Province is Puli Alam [3]. |
| 5ae26fad554299495565da6f | 1.00 | 1.00 | 1.00 | 1.00 | 2431 ms | The historical drama is *Russian Ark* [1][2]. It was directed by Alexander Sokurov and filmed entirely in the Winter Palace of the Russian State Hermitage Museu |
| 5ae3281a5542991a06ce9939 | 1.00 | 1.00 | 1.00 | 1.00 | 2615 ms | No, both are not American film directors. While Frank Lloyd was an American film director [1], Olivier Assayas is a French film director [2]. |
| 5ae377415542992e3233c40a | 1.00 | 1.00 | 1.00 | 1.00 | 2894 ms | Zane Grey was an American dentist and author [1]. |
| 5ae46ebc5542995dadf24331 | 1.00 | 1.00 | 1.00 | 1.00 | 3206 ms | The Airbus A380, whose entertainment systems use RedBoot, is a double-deck, wide-body, four-engine jet airliner manufactured by the European manufacturer Airbus |
| 5ae4903855429913cc2044a0 | 1.00 | 1.00 | 1.00 | 1.00 | 2441 ms | Both *Woodstock* and *American Dream* are documentary films [1][2]. |
| 5ae54c085542992663a4f1c4 | 1.00 | 1.00 | 1.00 | 1.00 | 3302 ms | The Forests of Mara and Mondrem were home to red, fallow, and roe deer [1]. Red deer are also native to or found in most of Europe, the Caucasus Mountains regio |
| 5ae5aba0554299546bf82f17 | 1.00 | 1.00 | 1.00 | 1.00 | 3273 ms | Tara Strong's major voice roles include *Teen Titans Go!* [2][5], which is an American animated television series based on the DC Comics fictional superhero tea |
| 5ae5b301554299546bf82f2d | 1.00 | 1.00 | 1.00 | 1.00 | 2068 ms | The hormone that promotes sodium retention in the distal nephron is aldosterone [2]. Aldosterone is produced by the zona glomerulosa of the adrenal cortex in th |
| 5ae5d7b755429929b08079cd | 1.00 | 1.00 | 1.00 | 1.00 | 2929 ms | Wallace Fard Muhammad, the founder of the Nation of Islam, was last seen by Elijah Muhammad in 1933, when he took off in an airplane from the Detroit airport [1 |
| 5ae608f2554299546bf83026 | 1.00 | 1.00 | 1.00 | 1.00 | 3202 ms | The Hamburg Mountains are a range of the New York-New Jersey Highlands region of the Appalachian Mountains [1]. The Appalachian Mountains are a system of mounta |
| 5ae618325542996de7b71b56 | 1.00 | 1.00 | 1.00 | 1.00 | 2602 ms | Gerald Grosvenor, 6th Duke of Westminster, was succeeded by his son, Hugh Grosvenor, 7th Duke of Westminster [1][2]. Hugh Grosvenor is estimated to be worth US$ |
| 5ae6d3345542996d980e7c85 | 1.00 | 1.00 | 0.00 | 1.00 | 4305 ms | I don't know based on the provided documents. |
| 5ae731ae5542991bbc9761c1 | 1.00 | 1.00 | 1.00 | 1.00 | 2833 ms | Following the 1972 World Cup, John Grant joined the English club Warrington [1]. Warrington Wolves now play their games at the Halliwell Jones Stadium [3]. |
| 5ae74fc45542997b22f6a6b4 | 1.00 | 1.00 | 1.00 | 1.00 | 3091 ms | The full name of the viral respiratory disease is severe acute respiratory syndrome (SARS) [1][2]. Yi Guan's research on SARS enabled the Chinese government to  |
| 5ae819ac55429952e35eaa16 | 1.00 | 1.00 | 1.00 | 1.00 | 3149 ms | The episode "Marry Me a Little, Marry Me a Little More" originally aired on the National Broadcasting Company (NBC) [1]. |
