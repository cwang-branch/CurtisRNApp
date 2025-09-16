import React, { useEffect, useState } from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// --- Mock Branch SDK ---
// In a real app, you would install this with `npm install react-native-branch`
// This mock simulates the SDK's behavior for testing purposes in this environment.
const branch = {
  _listeners: [],
  _mockLinkData: null,

  // Standard event names
  STANDARD_EVENT_ADD_TO_CART: 'ADD_TO_CART',
  STANDARD_EVENT_PURCHASE: 'PURCHASE',
  STANDARD_EVENT_VIEW_ITEM: 'VIEW_ITEM',
  STANDARD_EVENT_COMPLETE_REGISTRATION: 'COMPLETE_REGISTRATION',

  // Simulate subscribing to deep link data
  subscribe: function (callback) {
    this._listeners.push(callback);
    console.log('Branch SDK: Subscribed to link events.');

    // Simulate app open from a link
    if (this._mockLinkData) {
      setTimeout(() => {
        callback({ error: null, params: this._mockLinkData, uri: 'brnch://open?data=...' });
        this._mockLinkData = null; // Consume the link data
      }, 500);
    }

    // Return an unsubscribe function
    return () => {
      this._listeners = this._listeners.filter(cb => cb !== callback);
      console.log('Branch SDK: Unsubscribed from link events.');
    };
  },

  // Simulate creating a BranchUniversalObject
  createBranchUniversalObject: async function (identifier, options) {
    console.log(`Branch SDK: Created Universal Object with identifier: ${identifier}`, options);
    const buo = {
      identifier,
      options,
      // Simulate showing the share sheet
      showShareSheet: async (shareOptions, linkProperties, controlParams) => {
        console.log('Branch SDK: showShareSheet called with:', { shareOptions, linkProperties, controlParams });
        const mockUrl = `https://your-app.test-app.link/AasE/c1DeF2gH3?feature=${linkProperties.feature}&channel=${shareOptions.messageHeader}`;
        
        // On a real device, this would open a native share sheet.
        // We simulate this by logging and returning a success state.
        alert(
          'Share Sheet Simulation',
          `In a real app, this would open a share sheet.\n\nGenerated URL:\n${mockUrl}\n\nPress "Simulate Click" to test opening this link.`
        );
        
        // Add a button to simulate clicking the link
        this._mockLinkData = {
          '+clicked_branch_link': true,
          '+is_first_session': false,
          '~feature': linkProperties.feature,
          '~channel': shareOptions.messageHeader,
          '$desktop_url': controlParams.$desktop_url,
          custom_data: options.contentMetadata.customMetadata.custom_data,
          deep_link_prop: 'value123',
        };

        return {
          channel: 'simulated_channel',
          completed: true,
          error: null,
        };
      },
    };
    return buo;
  },

  // Simulate logging an event
  logEvent: async function (eventName, eventParams = {}) {
    console.log(`Branch SDK: Logged event "${eventName}"`, eventParams);
    return Promise.resolve();
  },
};

// A simple custom alert for better display in web-based environments
const alert = (title, message) => {
    // In a real app, you might use a custom modal component.
    // window.alert is used here for simplicity.
    window.alert(`[${title}]\n\n${message}`);
};


// --- Main App Component ---
export default function App() {
  const [branchLinkData, setBranchLinkData] = useState(null);
  const [logs, setLogs] = useState([]);

  // Helper function to add a new log entry
  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(message);
    setLogs(prevLogs => [`[${timestamp}] ${message}`, ...prevLogs]);
  };

  // Effect to subscribe to Branch deep link events on component mount
  useEffect(() => {
    addLog('App mounted. Subscribing to Branch session data...');
    
    const unsubscribe = branch.subscribe(({ error, params, uri }) => {
      if (error) {
        addLog(`Error from Branch: ${error}`);
        return;
      }
      
      if (params) {
        if (params['+clicked_branch_link']) {
            addLog('Opened from a Branch link!');
            setBranchLinkData(params);
        } else if (params['+non_branch_link']) {
            addLog(`Opened from a non-Branch link: ${uri}`);
        } else {
            addLog('Branch session initialized.');
        }
      }
    });

    // Unsubscribe on component unmount
    return () => {
        unsubscribe();
        addLog('App unmounted. Unsubscribed from Branch.');
    };
  }, []);

  // --- SDK Action Handlers ---

  // 1. Create and share a Branch deep link
  const handleCreateLink = async () => {
    addLog('Creating Branch Universal Object...');
    const buo = await branch.createBranchUniversalObject('item/12345', {
      locallyIndex: true,
      title: 'Cool Item 12345',
      contentDescription: 'This item is amazing! Check it out.',
      contentImageUrl: 'https://placehold.co/600x400/3498db/ffffff?text=Cool+Item',
      contentMetadata: {
        customMetadata: {
          custom_data: 'value_here',
          user_id: 'user-id-abc',
        },
      },
    });
    addLog('BUO created. Showing share sheet...');

    const shareOptions = {
      messageHeader: 'Check this out!',
      messageBody: 'I found this cool item and thought you would like it.',
    };

    const linkProperties = {
      feature: 'sharing',
      channel: 'in-app-test',
    };

    const controlParams = {
      $desktop_url: 'https://your-website.com/items/12345',
    };

    const { channel, completed, error } = await buo.showShareSheet(shareOptions, linkProperties, controlParams);

    if (error) {
      addLog(`Share sheet error: ${error}`);
    } else {
      addLog(`Share completed via ${channel}. Completed: ${completed}`);
    }
  };

  // 2. Track a standard e-commerce event
  const handleLogPurchaseEvent = () => {
    addLog('Logging "Purchase" event...');
    branch.logEvent(branch.STANDARD_EVENT_PURCHASE, {
      transactionID: 'txn-12345',
      currency: 'USD',
      revenue: 59.99,
      shipping: 5.99,
      tax: 2.50,
      coupon: 'SUMMER_SALE',
      affiliation: 'mobile_app',
      description: 'User purchased an item.',
      customData: {
        product_id: 'prod-001',
        product_name: 'Premium Widget'
      }
    });
    addLog('"Purchase" event logged.');
  };
  
  // 3. Track another standard event
  const handleLogAddToCartEvent = () => {
    addLog('Logging "Add to Cart" event...');
    branch.logEvent(branch.STANDARD_EVENT_ADD_TO_CART, {
        currency: 'USD',
        revenue: 25.00,
        description: 'User added item to cart',
        content_items: ['item/12345']
    });
    addLog('"Add to Cart" event logged.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Branch SDK Test App</Text>
        </View>

        {/* Deep Link Data Display */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deep Link Data</Text>
          <View style={styles.dataContainer}>
            {branchLinkData ? (
              <Text style={styles.dataText}>{JSON.stringify(branchLinkData, null, 2)}</Text>
            ) : (
              <Text style={styles.placeholderText}>
                Click a simulated Branch link to see data here.
              </Text>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <StyledButton title="Create & Share Branch Link" onPress={handleCreateLink} />
          <StyledButton title="Log 'Purchase' Event" onPress={handleLogPurchaseEvent} />
          <StyledButton title="Log 'Add to Cart' Event" onPress={handleLogAddToCartEvent} />
        </View>

        {/* Logs */}
        <View style={[styles.section, { flex: 1 }]}>
          <Text style={styles.sectionTitle}>Logs</Text>
          <ScrollView style={styles.logContainer} contentContainerStyle={{ padding: 10 }}>
            {logs.map((log, index) => (
              <Text key={index} style={styles.logText}>{log}</Text>
            ))}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

// --- Reusable Button Component ---
const StyledButton = ({ title, onPress }) => (
  <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.buttonText}>{title}</Text>
  </TouchableOpacity>
);

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1c1e21',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  dataContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dataText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: '#333',
  },
  placeholderText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#2d3748', // Dark background for logs
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4a5568',
  },
  logText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: '#e2e8f0', // Light text for dark background
    marginBottom: 4,
  },
});
