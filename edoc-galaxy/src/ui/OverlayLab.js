"use client";

import { useState } from "react";
import { LogOut, ShieldAlert, Sparkles } from "lucide-react";
import Button from "./Button";
import Dialog from "./Dialog";
import Drawer from "./Drawer";

/** Review page content: opens each shared Dialog and Drawer variant. Not part of the game. */
export default function OverlayLab() {
  const [open, setOpen] = useState(null);
  const close = () => setOpen(null);

  return (
    <section className="ui-lab" style={{ display: "grid", gap: 16 }}>
      <p className="t-body">
        Open each one, then try Escape, a click on the dark area, and Tab. Focus should stay inside and come back to the
        button you pressed.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <Button variant="secondary" onClick={() => setOpen("confirm")}>Dialog: confirm</Button>
        <Button variant="secondary" onClick={() => setOpen("danger")}>Dialog: must answer</Button>
        <Button variant="secondary" onClick={() => setOpen("reward")}>Dialog: centred</Button>
        <Button variant="secondary" onClick={() => setOpen("right")}>Drawer: right</Button>
        <Button variant="secondary" onClick={() => setOpen("left")}>Drawer: left</Button>
        <Button variant="secondary" onClick={() => setOpen("bottom")}>Drawer: bottom sheet</Button>
      </div>

      {open === "confirm" && (
        <Dialog
          icon={LogOut}
          title="Exit edoc?"
          onClose={close}
          actions={
            <>
              <Button variant="secondary" onClick={close}>Stay</Button>
              <Button onClick={close}>Exit</Button>
            </>
          }
        >
          Your progress is saved to your account. You&rsquo;ll pick up exactly where you left off next time.
        </Dialog>
      )}
      {open === "danger" && (
        <Dialog
          icon={ShieldAlert}
          tone="danger"
          alert
          align="center"
          dismissible={false}
          title="Hull breached"
          onClose={close}
          actions={<Button size="lg" onClick={close}>Rematch</Button>}
        >
          The concept that beat you: <strong>loop conditions</strong>. This one cannot be dismissed with Escape or a click outside.
        </Dialog>
      )}
      {open === "reward" && (
        <Dialog
          icon={Sparkles}
          tone="teal"
          align="center"
          title="New suit unlocked"
          onClose={close}
          actions={<Button onClick={close}>Equip it</Button>}
        >
          The Starfarer suit is yours. You can change it any time in the hangar.
        </Dialog>
      )}
      {(open === "right" || open === "left" || open === "bottom") && (
        <Drawer
          side={open}
          eyebrow="Python"
          title="Module details"
          onClose={close}
          footer={
            <>
              <Button variant="secondary" onClick={close}>Close</Button>
              <Button onClick={close}>Start module</Button>
            </>
          }
        >
          <div style={{ display: "grid", gap: 14 }}>
            <p className="t-body">Ten encounters on variables, strings and numbers. Each one is a short code challenge against a guardian.</p>
            {Array.from({ length: 12 }, (_, i) => (
              <p key={i} className="t-small">Encounter {i + 1}: a short challenge that checks one idea before the next unlocks.</p>
            ))}
          </div>
        </Drawer>
      )}
    </section>
  );
}
