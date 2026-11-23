# Prüfungs-Simulationslabor: Freier Fall (`FreierFallPruefungLab`)

Eigenständiges, schummelsicheres Prüfungs-Simulationsmodul für **SchoolLabs** (Physik Klasse 10) zur experimentellen Untersuchung des **freien Falls** zuhause oder im Unterricht.

## Kernfunktionen für die Prüfung mit 3 Schülern

1. **Komplett ohne Formel- oder Planeten-Spoiler**:
   - Weder das Weg-Zeit-Gesetz $s(t) = \frac{1}{2} g t^2$ noch die umgestellte Formel $g = \frac{2s}{t^2}$ werden in der Oberfläche verraten.
   - Keine bekannten Planetennamen („Mars“, „Mond“, „Erde“), die einfach gegoogelt oder per KI abgefragt werden könnten.
2. **3 individuelle Prüflings-Stationen (Prüfling A, B, C)**:
   - **Prüfling A (`Sektor Alpha-1`)**: $g_{\text{wahr}} = 4{,}65\text{ m/s}^2$, Haltemagnet-Verzug $\Delta t_{\text{Magnet}} = +18\text{ ms}$, Streuung $\pm 8\text{ ms}$
   - **Prüfling B (`Sektor Beta-2`)**: $g_{\text{wahr}} = 6{,}35\text{ m/s}^2$, Haltemagnet-Verzug $\Delta t_{\text{Magnet}} = +16\text{ ms}$, Streuung $\pm 8\text{ ms}$
   - **Prüfling C (`Sektor Gamma-3`)**: $g_{\text{wahr}} = 11{,}85\text{ m/s}^2$, Haltemagnet-Verzug $\Delta t_{\text{Magnet}} = +14\text{ ms}$, Streuung $\pm 7\text{ ms}$
3. **Realistische Messwerte wie im echten Physik-Labor**:
   - Statistische Lichtschranken-Streuung ($\pm 7\text{–}8\text{ ms}$) zwingt zu Mehrfachmessungen und Mittelwertbildung $\bar{t}_2$.
   - Kleiner systematischer Auslöseverzug des Haltemagneten ($\approx +14\text{–}18\text{ ms}$) führt bei sehr kurzen Fallstrecken ($s_2 = 0{,}5\text{ m}$) zu einer realistischen systematischen Abweichung nach unten.
   - Umschaltbare Fallröhre: **Evakuiert (Vakuum, 0 mbar)** vs. **Belüftet (Atmosphäre, 1 013 mbar)** für den experimentellen Vergleich von leichter ($0{,}1\text{ kg}$) und schwerer Kugel ($5{,}0\text{ kg}$).
4. **4 KI-resistente Prüfungsaufgaben & Foto-Upload**:
   - **Aufgabe 1**: Dreifachmessungen bei 3 Fallstrecken im Vakuum, Mittelwertbildung $\bar{t}_2$ und Berechnung von $g_{\text{exp}}$.
   - **Aufgabe 2**: Massenunabhängigkeit ($0{,}1\text{ kg}$ vs. $5{,}0\text{ kg}$) im Vakuum vs. Luft anhand der konkreten eigenen Messstreuung (in ms) begründen.
   - **Aufgabe 3**: Systematische Abweichung bei $s_2 = 0{,}5\text{ m}$ durch den Haltemagnet-Verzug analysieren.
   - **Aufgabe 4**: Direkt-Upload von 1–3 Fotos des handschriftlichen Rechenwegs und der $s(t)$-/ $v(t)$-Diagrammskizze.
5. **Online-Protokollabgabe & Lehrer-Abruf-Cockpit**:
   - Ein-Klick-Abgabe sendet das Protokoll an `/api/exam-protocols/freier-fall-pruefung` auf dem SchoolLabs-Server.
   - Über den Button **„📬 Lehrer-Abruf“** (Standard-PIN: `2026` oder `1234`) ruft die Lehrkraft alle eingegangenen Protokolle inkl. automatischem Soll-Ist-Abgleich ($g_{\text{wahr}}$ vs. $g_{\text{aus Schülertabelle}}$ vs. $g_{\text{Schüler}}$), Fotos, Antworten, Bearbeitungsdauer sowie Tab-Wechsel- und Copy-Paste-Zähler ab.
