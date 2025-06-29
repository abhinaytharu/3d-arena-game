from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room, leave_room
import json
import time
from datetime import datetime
import game_logic

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
socketio = SocketIO(app, cors_allowed_origins="*", logger=True, engineio_logger=True)

# Store player data with additional information
players = {}
player_count = 0

@app.route('/')
def index():
    return "3D Arena Shooter Backend Running"

@app.route('/health')
def health_check():
    return {"status": "healthy", "players_online": len(players), "timestamp": datetime.now().isoformat()}

@socketio.on('connect')
def handle_connect():
    global player_count
    player_count += 1
    player_id = request.sid
    
    # Initialize player data
    players[player_id] = {
        'id': player_id,
        'x': 0.0,
        'y': 1.0,  # Player height
        'z': 0.0,
        'rotation': 0.0,  # Player rotation
        'health': 100,
        'connected_at': time.time(),
        'last_update': time.time()
    }
    
    print(f'Player {player_id} connected. Total players: {len(players)}')
    
    # Send current player data to the new player
    emit('game_state', {
        'players': players,
        'player_id': player_id,
        'message': 'Welcome to the arena!'
    })
    
    # Notify other players about the new player
    emit('player_joined', {
        'player': players[player_id],
        'total_players': len(players)
    }, broadcast=True, include_self=False)

@socketio.on('disconnect')
def handle_disconnect():
    global player_count
    player_id = request.sid
    
    if player_id in players:
        player_data = players.pop(player_id)
        player_count -= 1
        
        print(f'Player {player_id} disconnected. Total players: {len(players)}')
        
        # Notify remaining players about the disconnected player
        emit('player_left', {
            'player_id': player_id,
            'total_players': len(players)
        }, broadcast=True)

@socketio.on('player_move')
def handle_player_move(data):
    """Handle player movement updates"""
    player_id = request.sid
    
    if player_id not in players:
        return
    
    try:
        # Update player position
        players[player_id].update({
            'x': float(data.get('x', players[player_id]['x'])),
            'y': float(data.get('y', players[player_id]['y'])),
            'z': float(data.get('z', players[player_id]['z'])),
            'rotation': float(data.get('rotation', players[player_id]['rotation'])),
            'last_update': time.time()
        })
        
        # Broadcast updated position to all other players
        emit('player_moved', {
            'player_id': player_id,
            'position': {
                'x': players[player_id]['x'],
                'y': players[player_id]['y'],
                'z': players[player_id]['z'],
                'rotation': players[player_id]['rotation']
            }
        }, broadcast=True, include_self=False)
        
    except (ValueError, TypeError) as e:
        print(f'Error processing movement data from {player_id}: {e}')
        emit('error', {'message': 'Invalid movement data'})

@socketio.on('player_action')
def handle_player_action(data):
    """Handle player actions like shooting, jumping, etc."""
    player_id = request.sid
    
    if player_id not in players:
        return
    
    action_type = data.get('type')
    action_data = data.get('data', {})
    
    print(f'Player {player_id} performed action: {action_type}')
    
    # Broadcast action to all other players
    emit('player_action', {
        'player_id': player_id,
        'action_type': action_type,
        'action_data': action_data,
        'timestamp': time.time()
    }, broadcast=True, include_self=False)

@socketio.on('shoot')
def handle_shoot(data):
    """Handle player shooting with ray casting"""
    player_id = request.sid
    
    if player_id not in players:
        return
    
    try:
        # Extract shooting data
        ray_origin = data.get('origin', {})
        ray_direction = data.get('direction', {})
        player_position = data.get('player_position', {})
        
        # Validate ray data
        if not all(key in ray_origin for key in ['x', 'y', 'z']):
            raise ValueError("Invalid ray origin")
        if not all(key in ray_direction for key in ['x', 'y', 'z']):
            raise ValueError("Invalid ray direction")
        
        # Create ray data for processing
        ray_data = {
            'origin': {
                'x': float(ray_origin['x']),
                'y': float(ray_origin['y']),
                'z': float(ray_origin['z'])
            },
            'direction': {
                'x': float(ray_direction['x']),
                'y': float(ray_direction['y']),
                'z': float(ray_direction['z'])
            },
            'player_position': {
                'x': float(player_position.get('x', players[player_id]['x'])),
                'y': float(player_position.get('y', players[player_id]['y'])),
                'z': float(player_position.get('z', players[player_id]['z']))
            }
        }
        
        # Check for hits using game logic (if available)
        hit_data = None
        try:
            hit_data = game_logic.check_ray_hit(ray_data, players)
        except:
            # Fallback to simple distance-based hit detection
            hit_data = simple_ray_hit_detection(ray_data, players, player_id)
        
        print(f'Player {player_id} shot from {ray_data["origin"]} in direction {ray_data["direction"]}')
        
        # Broadcast shooting event to all players
        emit('player_shot', {
            'player_id': player_id,
            'ray_data': ray_data,
            'hit_data': hit_data,
            'timestamp': time.time()
        }, broadcast=True)
        
        # Send hit confirmation to shooter if there was a hit
        if hit_data and hit_data.get('hit'):
            emit('shot_hit', {
                'target_id': hit_data['target_id'],
                'hit_position': hit_data['hit_position'],
                'damage': hit_data.get('damage', 25)
            })
            
            # Update target player health if hit
            target_id = hit_data['target_id']
            if target_id in players:
                players[target_id]['health'] = max(0, players[target_id]['health'] - hit_data.get('damage', 25))
                
                # Broadcast health update
                emit('player_health_update', {
                    'player_id': target_id,
                    'health': players[target_id]['health']
                }, broadcast=True)
                
                # Check if player was eliminated
                if players[target_id]['health'] <= 0:
                    emit('player_eliminated', {
                        'player_id': target_id,
                        'eliminated_by': player_id
                    }, broadcast=True)
        
    except (ValueError, TypeError, KeyError) as e:
        print(f'Error processing shoot data from {player_id}: {e}')
        emit('error', {'message': 'Invalid shoot data'})

def simple_ray_hit_detection(ray_data, players, shooter_id):
    """Simple ray hit detection using distance calculations"""
    ray_origin = ray_data['origin']
    ray_direction = ray_data['direction']
    
    closest_hit = None
    min_distance = float('inf')
    
    for player_id, player_data in players.items():
        if player_id == shooter_id:
            continue  # Skip shooter
        
        # Calculate distance from ray to player
        player_pos = {
            'x': player_data['x'],
            'y': player_data['y'],
            'z': player_data['z']
        }
        
        # Simple sphere intersection test (player as sphere with radius 0.5)
        distance = calculate_ray_sphere_intersection(
            ray_origin, ray_direction, player_pos, 0.5
        )
        
        if distance is not None and distance < min_distance and distance > 0:
            min_distance = distance
            closest_hit = {
                'hit': True,
                'target_id': player_id,
                'hit_position': {
                    'x': ray_origin['x'] + ray_direction['x'] * distance,
                    'y': ray_origin['y'] + ray_direction['y'] * distance,
                    'z': ray_origin['z'] + ray_direction['z'] * distance
                },
                'distance': distance,
                'damage': 25
            }
    
    return closest_hit or {'hit': False}

def calculate_ray_sphere_intersection(ray_origin, ray_direction, sphere_center, sphere_radius):
    """Calculate intersection between ray and sphere"""
    # Vector from ray origin to sphere center
    oc = {
        'x': sphere_center['x'] - ray_origin['x'],
        'y': sphere_center['y'] - ray_origin['y'],
        'z': sphere_center['z'] - ray_origin['z']
    }
    
    # Project oc onto ray direction
    tca = oc['x'] * ray_direction['x'] + oc['y'] * ray_direction['y'] + oc['z'] * ray_direction['z']
    
    if tca < 0:
        return None  # Sphere is behind ray origin
    
    # Distance from sphere center to ray
    d2 = (oc['x'] * oc['x'] + oc['y'] * oc['y'] + oc['z'] * oc['z']) - (tca * tca)
    
    if d2 > sphere_radius * sphere_radius:
        return None  # Ray misses sphere
    
    # Distance from intersection to projection point
    thc = (sphere_radius * sphere_radius - d2) ** 0.5
    
    # Two intersection points
    t0 = tca - thc
    t1 = tca + thc
    
    # Return closest positive intersection
    if t0 > 0:
        return t0
    elif t1 > 0:
        return t1
    
    return None

@socketio.on('request_game_state')
def handle_game_state_request():
    """Send current game state to requesting player"""
    player_id = request.sid
    
    emit('game_state', {
        'players': players,
        'player_id': player_id,
        'timestamp': time.time()
    })

@socketio.on('ping')
def handle_ping():
    """Handle ping for latency testing"""
    emit('pong', {'timestamp': time.time()})

# Periodic cleanup of disconnected players
def cleanup_disconnected_players():
    """Remove players who haven't updated in the last 10 seconds"""
    current_time = time.time()
    disconnected_players = []
    
    for player_id, player_data in players.items():
        if current_time - player_data['last_update'] > 10:
            disconnected_players.append(player_id)
    
    for player_id in disconnected_players:
        players.pop(player_id, None)
        print(f'Cleaned up disconnected player: {player_id}')
    
    if disconnected_players:
        emit('players_cleaned', {
            'disconnected_players': disconnected_players,
            'total_players': len(players)
        }, broadcast=True)

# Schedule periodic cleanup
@socketio.on('connect')
def schedule_cleanup():
    socketio.start_background_task(periodic_cleanup)

def periodic_cleanup():
    """Background task for periodic cleanup"""
    import time
    while True:
        time.sleep(30)  # Run every 30 seconds
        cleanup_disconnected_players()

if __name__ == '__main__':
    print("Starting 3D Arena Shooter Server...")
    print("Server will be available at http://localhost:5000")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True) 