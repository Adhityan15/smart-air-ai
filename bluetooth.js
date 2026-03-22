window.BluetoothConnector = (function () {

  let device = null;
  let characteristic = null;
  let last = null;

  const SERVICE_UUID = "12345678-1234-1234-1234-1234567890ab";
  const CHARACTERISTIC_UUID = "abcd1234-5678-1234-5678-abcdef123456";

  async function connect(onData) {

    // If already selected, reuse device
    if (!device) {
      device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [SERVICE_UUID]
      });
    }

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

    await characteristic.startNotifications();

    console.log("✅ BLE Connected");

    characteristic.addEventListener("characteristicvaluechanged", (event) => {

      const value = new TextDecoder().decode(event.target.value);

      try {
        const obj = JSON.parse(value);

        const formatted = {
          aq: obj.air,
          temp: obj.temperature,
          hum: obj.humidity,
          gas: obj.gas,
          gas_status: obj.gas_status,
          pulse: obj.pulse,
          health: obj.health,
          suggestion: obj.suggestion
        };

        last = formatted;

        // 🔥 STORE DATA (KEY FIX)
        localStorage.setItem("aircare_live", JSON.stringify(formatted));

        if (onData) onData(formatted);

      } catch (e) {
        console.error("JSON Parse Error:", e);
      }
    });
  }

  // 🔥 AUTO RECONNECT (IMPORTANT)
  async function reconnect(onData) {
    if (device && device.gatt && device.gatt.connected) {
      console.log("Already connected");
      return;
    }

    if (device) {
      try {
        await connect(onData);
      } catch (e) {
        console.warn("Reconnect failed");
      }
    }
  }

  function disconnect() {
    if (device && device.gatt.connected) {
      device.gatt.disconnect();
      device = null; // reset
      console.log("Disconnected manually");
    }
  }

  function getLastReading() {
    return last || JSON.parse(localStorage.getItem("aircare_live"));
  }

  return { connect, reconnect, disconnect, getLastReading };

})();