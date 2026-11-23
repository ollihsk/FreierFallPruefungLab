# Prüfungs-Simulationslabor: Freier Fall (`FreierFallPruefungLab`)

Eigenständiges, schummelsicheres Prüfungs-Simulationsmodul für **SchoolLabs** (Physik Klasse 10) zur experimentellen Untersuchung des **freien Falls** zuhause oder im Unterricht.

## Kernfunktionen für die Prüfung

1. **Komplett ohne Formel- oder Planeten-Spoiler**:
   - In der Prüflingsoberfläche werden keine Formeln oder bekannte Planetennamen („Mars“, „Mond“, „Erde“) angezeigt.
2. **3 individuelle Prüflings-Stationen (Prüfling A, B, C)**:
   - **Prüfling A (`Sektor Alpha-1`)**
   - **Prüfling B (`Sektor Beta-2`)**
   - **Prüfling C (`Sektor Gamma-3`)**
3. **Realistische Messwerte wie im echten Physik-Labor**:
   - Statistische Lichtschranken-Streuung erfordert Mehrfachmessungen und Mittelwertbildung.
   - Kleiner systematischer Auslöseverzug des Haltemagneten für die Fehleranalyse bei kurzen vs. langen Fallstrecken.
   - Umschaltbare Fallröhre: **Evakuiert (Vakuum, 0 mbar)** vs. **Belüftet (Atmosphäre, 1 013 mbar)** für den experimentellen Vergleich von leichter ($0{,}1\text{ kg}$) und schwerer Kugel ($5{,}0\text{ kg}$).
4. **4 KI-resistente Prüfungsaufgaben & Foto-Upload**:
   - **Aufgabe 1**: Dreifachmessungen bei 3 Fallstrecken im Vakuum, Mittelwertbildung und Berechnung von $g_{\text{exp}}$.
   - **Aufgabe 2**: Massenunabhängigkeit ($0{,}1\text{ kg}$ vs. $5{,}0\text{ kg}$) im Vakuum vs. Luft anhand der konkreten eigenen Messstreuung (in ms) begründen.
   - **Aufgabe 3**: Systematische Abweichung bei $s_2 = 0{,}5\text{ m}$ durch den Haltemagnet-Verzug analysieren.
   - **Aufgabe 4**: Direkt-Upload von 1–3 Fotos des handschriftlichen Rechenwegs und der $s(t)$-/ $v(t)$-Diagrammskizze.
5. **Online-Protokollabgabe & Lehrer-Abruf-Cockpit**:
   - Ein-Klick-Abgabe sendet das Protokoll an `/api/exam-protocols/freier-fall-pruefung` auf dem SchoolLabs-Server.
   - Über den PIN-geschützten Button **„📬 Lehrer-Abruf“** ruft die Lehrkraft alle eingegangenen Protokolle inkl. automatischem Soll-Ist-Abgleich, Fotos, Antworten, Bearbeitungsdauer sowie Tab-Wechsel- und Copy-Paste-Zähler ab.
