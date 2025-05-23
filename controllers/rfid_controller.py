from mfrc522 import SimpleMFRC522
import traceback
import time
import threading

class RfidController:
    def __init__(self):
        # Initialize RFID reader
        self.reader = None
        self.lock = threading.Lock()  # For thread safety
        
        try:
            self.reader = SimpleMFRC522()
            print("RFID reader initialized successfully")
        except Exception as e:
            print(f"RFID initialization error: {e}")
            traceback.print_exc()

    def read_tag(self, block=True, timeout=0.5):
        """
        Read an RFID tag
        
        Args:
            block: If True, block until tag is read or timeout. If False, return immediately if no tag.
            timeout: Maximum time to wait for tag in seconds (only used if block=True)
            
        Returns:
            Tuple of (tag_id, tag_text) if successful, None otherwise
        """
        with self.lock:
            print("RFID: Checking for tag")
            
            if self.reader is None:
                print("RFID reader not available")
                return None
            
            try:
                if block:
                    # Blocking read with timeout
                    start_time = time.time()
                    while time.time() - start_time < timeout:
                        try:
                            # Try to read with a small timeout
                            return self.reader.read()
                        except Exception as e:
                            if "Timeout" in str(e):
                                # This is expected if no tag is present
                                time.sleep(0.1)  # Small sleep to avoid CPU spinning
                                continue
                            else:
                                # Other errors should be reported
                                print(f"Error reading RFID: {e}")
                                return None
                    
                    # Timeout reached
                    return None
                else:
                    # Non-blocking read
                    try:
                        # Attempt a quick read
                        return self.reader.read_no_block()
                    except Exception as e:
                        if "Timeout" not in str(e):
                            print(f"Error reading RFID: {e}")
                        return None
                    
            except Exception as e:
                print(f"Error reading RFID: {e}")
                return None
    
    def read_tag_async(self, callback, timeout=30):
        """
        Read a tag asynchronously and call the callback when done
        
        Args:
            callback: Function to call with result (tag_id, tag_text) or None
            timeout: Maximum time to wait for tag in seconds
        """
        def read_worker():
            result = self.read_tag(block=True, timeout=timeout)
            callback(result)
        
        threading.Thread(target=read_worker, daemon=True).start()