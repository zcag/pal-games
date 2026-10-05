var Bu="186",em={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},nm={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},zu=0,ll=1,Gu=2,im=3,sm=0,Js=1,ku=2,ps=3,ms=0,Ke=1,wn=2,Cn=0,$s=1,Ks=2,cl=3,hl=4,Hu=5,rm=6,gs=100,Vu=101,Wu=102,Xu=103,qu=104,Yu=200,Zu=201,Ju=202,$u=203,Ku=204,Qu=205,ju=206,td=207,ed=208,nd=209,id=210,sd=211,rd=212,ad=213,od=214,ld=0,cd=1,hd=2,ul=3,ud=4,dd=5,fd=6,pd=7,md=0,gd=1,_d=2,gn=0,dl=1,fl=2,pl=3,ml=4,gl=5,_l=6,xl=7,am="attached",om="detached",lm=300,_s=301,wi=302,ma=303,ga=304,Qs=306,xd=1000,_a=1001,vd=1002,si=1003,yd=1004,cm=1004,js=1005,hm=1005,Qe=1006,xa=1007,um=1007,Ci=1008,dm=1008,_n=1009,Sd=1010,Md=1011,tr=1012,vl=1013,ri=1014,Vn=1015,je=1016,yl=1017,Sl=1018,xs=1020,bd=35902,Td=35899,Ed=1021,Ad=1022,Rn=1023,Ri=1026,Ii=1027,wd=1028,Ml=1029,Pi=1030,bl=1031,fm=1032,Tl=1033,va=33776,ya=33777,Sa=33778,Ma=33779,El=35840,Al=35841,wl=35842,Cl=35843,Rl=36196,Il=37492,Pl=37496,Ll=37488,Nl=37489,ba=37490,Ul=37491,Dl=37808,Fl=37809,Ol=37810,Bl=37811,zl=37812,Gl=37813,kl=37814,Hl=37815,Vl=37816,Wl=37817,Xl=37818,ql=37819,Yl=37820,Zl=37821,Jl=36492,$l=36494,Kl=36495,Ql=36283,jl=36284,Ta=36285,tc=36286,pm=2200,mm=2201,gm=2202,_m=2300,xm=2301,vm=2302,ym=2303,Sm=2400,Mm=2401,bm=2402,Tm=2500,Em=2501,Cd=0,Rd=1,Id=2,Am=3200,wm=3201,Cm=3202,Rm=3203,ec=0,Pd=1,Li="",Ld="srgb",nc="srgb-linear",ic="linear",ge="srgb",Im="",Pm="rg",Lm="ga",Nm=0,Um=7680,Dm=7681,Fm=7682,Om=7683,Bm=34055,zm=34056,Gm=5386,km=512,Hm=513,Vm=514,Wm=515,Xm=516,qm=517,Ym=518,Zm=519,Nd=512,Ud=513,Dd=514,Ea=515,Fd=516,Od=517,Aa=518,Bd=519,Jm=35044,$m=35048,Km=35040,Qm=35045,jm=35049,tg=35041,eg=35046,ng=35050,ig=35042,sg="100",sc="300 es",rc=2000,rg=2001,ag={COMPUTE:"compute",RENDER:"render"},og={PERSPECTIVE:"perspective",LINEAR:"linear",FLAT:"flat"},lg={NORMAL:"normal",CENTROID:"centroid",SAMPLE:"sample",FIRST:"first",EITHER:"either"},cg={TEXTURE_COMPARE:"depthTextureCompare"},hg={NONE:0,SHARED:1,FULL:2};function ug(t){for(let e=t.length-1;e>=0;--e)if(t[e]>=65535)return!0;return!1}var dg={Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array};function os(t,e){return new dg[t](e)}function zd(t){return ArrayBuffer.isView(t)&&!(t instanceof DataView)}function cs(t){return document.createElementNS("http://www.w3.org/1999/xhtml",t)}function Gd(){let t=cs("canvas");return t.style.display="block",t}var wh={},ti=null;function fg(t){ti=t}function pg(){return ti}function Xs(...t){let e="THREE."+t.shift();if(ti)ti("log",e,...t);else console.log(e,...t)}function kd(t){let e=t[0];if(typeof e==="string"&&e.startsWith("TSL:")){let n=t[1];if(n&&n.isStackTrace)t[0]+=" "+n.getLocation();else t[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return t}function dt(...t){t=kd(t);let e="THREE."+t.shift();if(ti)ti("warn",e,...t);else{let n=t[0];if(n&&n.isStackTrace)console.warn(n.getError(e));else console.warn(e,...t)}}function Lt(...t){t=kd(t);let e="THREE."+t.shift();if(ti)ti("error",e,...t);else{let n=t[0];if(n&&n.isStackTrace)console.error(n.getError(e));else console.error(e,...t)}}function Gn(...t){let e=t.join(" ");if(e in wh)return;wh[e]=!0,dt(...t)}function Hd(t,e,n){return new Promise(function(i,s){function r(){switch(t.clientWaitSync(e,t.SYNC_FLUSH_COMMANDS_BIT,0)){case t.WAIT_FAILED:s();break;case t.TIMEOUT_EXPIRED:setTimeout(r,n);break;default:i()}}setTimeout(r,n)})}var Vd={[0]:1,[2]:6,[4]:7,[3]:5,[1]:0,[6]:2,[7]:4,[5]:3};class ln{addEventListener(t,e){if(this._listeners===void 0)this._listeners={};let n=this._listeners;if(n[t]===void 0)n[t]=[];if(n[t].indexOf(e)===-1)n[t].push(e)}hasEventListener(t,e){let n=this._listeners;if(n===void 0)return!1;return n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){let n=this._listeners;if(n===void 0)return;let i=n[t];if(i!==void 0){let s=i.indexOf(e);if(s!==-1)i.splice(s,1)}}dispatchEvent(t){let e=this._listeners;if(e===void 0)return;let n=e[t.type];if(n!==void 0){t.target=this;let i=n.slice(0);for(let s=0,r=i.length;s<r;s++)i[s].call(this,t);t.target=null}}}var Be=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Ch=1234567,Ti=Math.PI/180,Ei=180/Math.PI;function nn(){let t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(Be[t&255]+Be[t>>8&255]+Be[t>>16&255]+Be[t>>24&255]+"-"+Be[e&255]+Be[e>>8&255]+"-"+Be[e>>16&15|64]+Be[e>>24&255]+"-"+Be[n&63|128]+Be[n>>8&255]+"-"+Be[n>>16&255]+Be[n>>24&255]+Be[i&255]+Be[i>>8&255]+Be[i>>16&255]+Be[i>>24&255]).toLowerCase()}function Ht(t,e,n){return Math.max(e,Math.min(n,t))}function ac(t,e){return(t%e+e)%e}function mg(t,e,n,i,s){return i+(t-e)*(s-i)/(n-e)}function gg(t,e,n){if(t!==e)return(n-t)/(e-t);else return 0}function ks(t,e,n){return(1-n)*t+n*e}function _g(t,e,n,i){return ks(t,e,1-Math.exp(-n*i))}function xg(t,e=1){return e-Math.abs(ac(t,e*2)-e)}function vg(t,e,n){if(t<=e)return 0;if(t>=n)return 1;return t=(t-e)/(n-e),t*t*(3-2*t)}function yg(t,e,n){if(t<=e)return 0;if(t>=n)return 1;return t=(t-e)/(n-e),t*t*t*(t*(t*6-15)+10)}function Sg(t,e){return t+Math.floor(Math.random()*(e-t+1))}function Mg(t,e){return t+Math.random()*(e-t)}function bg(t){return t*(0.5-Math.random())}function Tg(t){if(t!==void 0)Ch=t;let e=Ch+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function Eg(t){return t*Ti}function Ag(t){return t*Ei}function wg(t){return t>0&&Number.isInteger(t)&&2**Math.round(Math.log2(t))===t}function Cg(t){return Math.pow(2,Math.ceil(Math.log(t)/Math.LN2))}function Rg(t){return Math.pow(2,Math.floor(Math.log(t)/Math.LN2))}function Ig(t,e,n,i,s){let{cos:r,sin:a}=Math,o=r(n/2),l=a(n/2),c=r((e+i)/2),h=a((e+i)/2),d=r((e-i)/2),u=a((e-i)/2),f=r((i-e)/2),m=a((i-e)/2);switch(s){case"XYX":t.set(o*h,l*d,l*u,o*c);break;case"YZY":t.set(l*u,o*h,l*d,o*c);break;case"ZXZ":t.set(l*d,l*u,o*h,o*c);break;case"XZX":t.set(o*h,l*m,l*f,o*c);break;case"YXY":t.set(l*f,o*h,l*m,o*c);break;case"ZYZ":t.set(l*m,l*f,o*h,o*c);break;default:dt("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function qe(t,e){switch(e.constructor){case Float32Array:return t;case Uint32Array:return t/4294967295;case Uint16Array:return t/65535;case Uint8Array:case Uint8ClampedArray:return t/255;case Int32Array:return Math.max(t/2147483647,-1);case Int16Array:return Math.max(t/32767,-1);case Int8Array:return Math.max(t/127,-1);default:throw Error("THREE.MathUtils: Invalid component type.")}}function Jt(t,e){switch(e.constructor){case Float32Array:return t;case Uint32Array:return Math.round(t*4294967295);case Uint16Array:return Math.round(t*65535);case Uint8Array:case Uint8ClampedArray:return Math.round(t*255);case Int32Array:return Math.round(t*2147483647);case Int16Array:return Math.round(t*32767);case Int8Array:return Math.round(t*127);default:throw Error("THREE.MathUtils: Invalid component type.")}}var Pg={DEG2RAD:Ti,RAD2DEG:Ei,generateUUID:nn,clamp:Ht,euclideanModulo:ac,mapLinear:mg,inverseLerp:gg,lerp:ks,damp:_g,pingpong:xg,smoothstep:vg,smootherstep:yg,randInt:Sg,randFloat:Mg,randFloatSpread:bg,seededRandom:Tg,degToRad:Eg,radToDeg:Ag,isPowerOfTwo:wg,ceilPowerOfTwo:Cg,floorPowerOfTwo:Rg,setQuaternionFromProperEuler:Ig,normalize:Jt,denormalize:qe};class j{static{j.prototype.isVector2=!0}constructor(t=0,e=0){this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw Error("THREE.Vector2: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw Error("THREE.Vector2: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){let e=this.x,n=this.y,i=t.elements;return this.x=i[0]*e+i[3]*n+i[6],this.y=i[1]*e+i[4]*n+i[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=Ht(this.x,t.x,e.x),this.y=Ht(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=Ht(this.x,t,e),this.y=Ht(this.y,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Ht(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(Ht(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){let n=Math.cos(e),i=Math.sin(e),s=this.x-t.x,r=this.y-t.y;return this.x=s*n-r*i+t.x,this.y=s*i+r*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class ke{constructor(t=0,e=0,n=0,i=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=i}static slerpFlat(t,e,n,i,s,r,a){let o=n[i+0],l=n[i+1],c=n[i+2],h=n[i+3],d=s[r+0],u=s[r+1],f=s[r+2],m=s[r+3];if(h!==m||o!==d||l!==u||c!==f){let _=o*d+l*u+c*f+h*m;if(_<0)d=-d,u=-u,f=-f,m=-m,_=-_;let g=1-a;if(_<0.9995){let p=Math.acos(_),S=Math.sin(p);g=Math.sin(g*p)/S,a=Math.sin(a*p)/S,o=o*g+d*a,l=l*g+u*a,c=c*g+f*a,h=h*g+m*a}else{o=o*g+d*a,l=l*g+u*a,c=c*g+f*a,h=h*g+m*a;let p=1/Math.sqrt(o*o+l*l+c*c+h*h);o*=p,l*=p,c*=p,h*=p}}t[e]=o,t[e+1]=l,t[e+2]=c,t[e+3]=h}static multiplyQuaternionsFlat(t,e,n,i,s,r){let a=n[i],o=n[i+1],l=n[i+2],c=n[i+3],h=s[r],d=s[r+1],u=s[r+2],f=s[r+3];return t[e]=a*f+c*h+o*u-l*d,t[e+1]=o*f+c*d+l*h-a*u,t[e+2]=l*f+c*u+a*d-o*h,t[e+3]=c*f-a*h-o*d-l*u,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,i){return this._x=t,this._y=e,this._z=n,this._w=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){let{_x:n,_y:i,_z:s,_order:r}=t,{cos:a,sin:o}=Math,l=a(n/2),c=a(i/2),h=a(s/2),d=o(n/2),u=o(i/2),f=o(s/2);switch(r){case"XYZ":this._x=d*c*h+l*u*f,this._y=l*u*h-d*c*f,this._z=l*c*f+d*u*h,this._w=l*c*h-d*u*f;break;case"YXZ":this._x=d*c*h+l*u*f,this._y=l*u*h-d*c*f,this._z=l*c*f-d*u*h,this._w=l*c*h+d*u*f;break;case"ZXY":this._x=d*c*h-l*u*f,this._y=l*u*h+d*c*f,this._z=l*c*f+d*u*h,this._w=l*c*h-d*u*f;break;case"ZYX":this._x=d*c*h-l*u*f,this._y=l*u*h+d*c*f,this._z=l*c*f-d*u*h,this._w=l*c*h+d*u*f;break;case"YZX":this._x=d*c*h+l*u*f,this._y=l*u*h+d*c*f,this._z=l*c*f-d*u*h,this._w=l*c*h-d*u*f;break;case"XZY":this._x=d*c*h-l*u*f,this._y=l*u*h-d*c*f,this._z=l*c*f+d*u*h,this._w=l*c*h+d*u*f;break;default:dt("Quaternion: .setFromEuler() encountered an unknown order: "+r)}if(e===!0)this._onChangeCallback();return this}setFromAxisAngle(t,e){let n=e/2,i=Math.sin(n);return this._x=t.x*i,this._y=t.y*i,this._z=t.z*i,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){let e=t.elements,n=e[0],i=e[4],s=e[8],r=e[1],a=e[5],o=e[9],l=e[2],c=e[6],h=e[10],d=n+a+h;if(d>0){let u=0.5/Math.sqrt(d+1);this._w=0.25/u,this._x=(c-o)*u,this._y=(s-l)*u,this._z=(r-i)*u}else if(n>a&&n>h){let u=2*Math.sqrt(1+n-a-h);this._w=(c-o)/u,this._x=0.25*u,this._y=(i+r)/u,this._z=(s+l)/u}else if(a>h){let u=2*Math.sqrt(1+a-n-h);this._w=(s-l)/u,this._x=(i+r)/u,this._y=0.25*u,this._z=(o+c)/u}else{let u=2*Math.sqrt(1+h-n-a);this._w=(r-i)/u,this._x=(s+l)/u,this._y=(o+c)/u,this._z=0.25*u}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;if(n<0.00000001)if(n=0,Math.abs(t.x)>Math.abs(t.z))this._x=-t.y,this._y=t.x,this._z=0,this._w=n;else this._x=0,this._y=-t.z,this._z=t.y,this._w=n;else this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n;return this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(Ht(this.dot(t),-1,1)))}rotateTowards(t,e){let n=this.angleTo(t);if(n===0)return this;let i=Math.min(1,e/n);return this.slerp(t,i),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();if(t===0)this._x=0,this._y=0,this._z=0,this._w=1;else t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t;return this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){let{_x:n,_y:i,_z:s,_w:r}=t,{_x:a,_y:o,_z:l,_w:c}=e;return this._x=n*c+r*a+i*l-s*o,this._y=i*c+r*o+s*a-n*l,this._z=s*c+r*l+n*o-i*a,this._w=r*c-n*a-i*o-s*l,this._onChangeCallback(),this}slerp(t,e){let{_x:n,_y:i,_z:s,_w:r}=t,a=this.dot(t);if(a<0)n=-n,i=-i,s=-s,r=-r,a=-a;let o=1-e;if(a<0.9995){let l=Math.acos(a),c=Math.sin(l);o=Math.sin(o*l)/c,e=Math.sin(e*l)/c,this._x=this._x*o+n*e,this._y=this._y*o+i*e,this._z=this._z*o+s*e,this._w=this._w*o+r*e,this._onChangeCallback()}else this._x=this._x*o+n*e,this._y=this._y*o+i*e,this._z=this._z*o+s*e,this._w=this._w*o+r*e,this.normalize();return this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){let t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),i=Math.sqrt(1-n),s=Math.sqrt(n);return this.set(i*Math.sin(t),i*Math.cos(t),s*Math.sin(e),s*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class R{static{R.prototype.isVector3=!0}constructor(t=0,e=0,n=0){this.x=t,this.y=e,this.z=n}set(t,e,n){if(n===void 0)n=this.z;return this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw Error("THREE.Vector3: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw Error("THREE.Vector3: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(Rh.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(Rh.setFromAxisAngle(t,e))}applyMatrix3(t){let e=this.x,n=this.y,i=this.z,s=t.elements;return this.x=s[0]*e+s[3]*n+s[6]*i,this.y=s[1]*e+s[4]*n+s[7]*i,this.z=s[2]*e+s[5]*n+s[8]*i,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){let e=this.x,n=this.y,i=this.z,s=t.elements,r=1/(s[3]*e+s[7]*n+s[11]*i+s[15]);return this.x=(s[0]*e+s[4]*n+s[8]*i+s[12])*r,this.y=(s[1]*e+s[5]*n+s[9]*i+s[13])*r,this.z=(s[2]*e+s[6]*n+s[10]*i+s[14])*r,this}applyQuaternion(t){let e=this.x,n=this.y,i=this.z,{x:s,y:r,z:a,w:o}=t,l=2*(r*i-a*n),c=2*(a*e-s*i),h=2*(s*n-r*e);return this.x=e+o*l+r*h-a*c,this.y=n+o*c+a*l-s*h,this.z=i+o*h+s*c-r*l,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){let e=this.x,n=this.y,i=this.z,s=t.elements;return this.x=s[0]*e+s[4]*n+s[8]*i,this.y=s[1]*e+s[5]*n+s[9]*i,this.z=s[2]*e+s[6]*n+s[10]*i,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=Ht(this.x,t.x,e.x),this.y=Ht(this.y,t.y,e.y),this.z=Ht(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=Ht(this.x,t,e),this.y=Ht(this.y,t,e),this.z=Ht(this.z,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Ht(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){let{x:n,y:i,z:s}=t,{x:r,y:a,z:o}=e;return this.x=i*o-s*a,this.y=s*r-n*o,this.z=n*a-i*r,this}projectOnVector(t){let e=t.lengthSq();if(e===0)return this.set(0,0,0);let n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return So.copy(this).projectOnVector(t),this.sub(So)}reflect(t){return this.sub(So.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(Ht(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y,i=this.z-t.z;return e*e+n*n+i*i}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){let i=Math.sin(e)*t;return this.x=i*Math.sin(n),this.y=Math.cos(e)*t,this.z=i*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){let e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),i=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=i,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}var So=new R,Rh=new ke;class Xt{static{Xt.prototype.isMatrix3=!0}constructor(t,e,n,i,s,r,a,o,l){if(this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0)this.set(t,e,n,i,s,r,a,o,l)}set(t,e,n,i,s,r,a,o,l){let c=this.elements;return c[0]=t,c[1]=i,c[2]=a,c[3]=e,c[4]=s,c[5]=o,c[6]=n,c[7]=r,c[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){let e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,i=e.elements,s=this.elements,r=n[0],a=n[3],o=n[6],l=n[1],c=n[4],h=n[7],d=n[2],u=n[5],f=n[8],m=i[0],_=i[3],g=i[6],p=i[1],S=i[4],E=i[7],x=i[2],T=i[5],C=i[8];return s[0]=r*m+a*p+o*x,s[3]=r*_+a*S+o*T,s[6]=r*g+a*E+o*C,s[1]=l*m+c*p+h*x,s[4]=l*_+c*S+h*T,s[7]=l*g+c*E+h*C,s[2]=d*m+u*p+f*x,s[5]=d*_+u*S+f*T,s[8]=d*g+u*E+f*C,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[1],i=t[2],s=t[3],r=t[4],a=t[5],o=t[6],l=t[7],c=t[8];return e*r*c-e*a*l-n*s*c+n*a*o+i*s*l-i*r*o}invert(){let t=this.elements,e=t[0],n=t[1],i=t[2],s=t[3],r=t[4],a=t[5],o=t[6],l=t[7],c=t[8],h=c*r-a*l,d=a*o-c*s,u=l*s-r*o,f=e*h+n*d+i*u;if(f===0)return this.set(0,0,0,0,0,0,0,0,0);let m=1/f;return t[0]=h*m,t[1]=(i*l-c*n)*m,t[2]=(a*n-i*r)*m,t[3]=d*m,t[4]=(c*e-i*o)*m,t[5]=(i*s-a*e)*m,t[6]=u*m,t[7]=(n*o-l*e)*m,t[8]=(r*e-n*s)*m,this}transpose(){let t,e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){let e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,i,s,r,a){let o=Math.cos(s),l=Math.sin(s);return this.set(n*o,n*l,-n*(o*r+l*a)+r+t,-i*l,i*o,-i*(-l*r+o*a)+a+e,0,0,1),this}scale(t,e){return Gn("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(Mo.makeScale(t,e)),this}rotate(t){return Gn("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(Mo.makeRotation(-t)),this}translate(t,e){return Gn("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(Mo.makeTranslation(t,e)),this}makeTranslation(t,e){if(t.isVector2)this.set(1,0,t.x,0,1,t.y,0,0,1);else this.set(1,0,t,0,1,e,0,0,1);return this}makeRotation(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){let e=this.elements,n=t.elements;for(let i=0;i<9;i++)if(e[i]!==n[i])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}}var Mo=new Xt,Ih=new Xt().set(0.4123908,0.3575843,0.1804808,0.212639,0.7151687,0.0721923,0.0193308,0.1191948,0.9505322),Ph=new Xt().set(3.2409699,-1.5373832,-0.4986108,-0.9692436,1.8759675,0.0415551,0.0556301,-0.203977,1.0569715);function Lg(){let t={enabled:!0,workingColorSpace:"srgb-linear",spaces:{},convert:function(s,r,a){if(this.enabled===!1||r===a||!r||!a)return s;if(this.spaces[r].transfer==="srgb")s.r=kn(s.r),s.g=kn(s.g),s.b=kn(s.b);if(this.spaces[r].primaries!==this.spaces[a].primaries)s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[a].fromXYZ);if(this.spaces[a].transfer==="srgb")s.r=ls(s.r),s.g=ls(s.g),s.b=ls(s.b);return s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){if(s==="")return"linear";return this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,a){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return Gn("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),t.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return Gn("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),t.colorSpaceToWorking(s,r)}},e=[0.64,0.33,0.3,0.6,0.15,0.06],n=[0.2126,0.7152,0.0722],i=[0.3127,0.329];return t.define({["srgb-linear"]:{primaries:e,whitePoint:i,transfer:"linear",toXYZ:Ih,fromXYZ:Ph,luminanceCoefficients:n,workingColorSpaceConfig:{unpackColorSpace:"srgb"},outputColorSpaceConfig:{drawingBufferColorSpace:"srgb"}},["srgb"]:{primaries:e,whitePoint:i,transfer:"srgb",toXYZ:Ih,fromXYZ:Ph,luminanceCoefficients:n,outputColorSpaceConfig:{drawingBufferColorSpace:"srgb"}}}),t}var ne=Lg();function kn(t){return t<0.04045?t*0.0773993808:Math.pow(t*0.9478672986+0.0521327014,2.4)}function ls(t){return t<0.0031308?t*12.92:1.055*Math.pow(t,0.41666)-0.055}var ki;class oc{static getDataURL(t,e="image/png"){if(/^data:/i.test(t.src))return t.src;if(typeof HTMLCanvasElement>"u")return t.src;let n;if(t instanceof HTMLCanvasElement)n=t;else{if(ki===void 0)ki=cs("canvas");ki.width=t.width,ki.height=t.height;let i=ki.getContext("2d");if(t instanceof ImageData)i.putImageData(t,0,0);else i.drawImage(t,0,0,t.width,t.height);n=ki}return n.toDataURL(e)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){let e=cs("canvas");e.width=t.width,e.height=t.height;let n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);let i=n.getImageData(0,0,t.width,t.height),s=i.data;for(let r=0;r<s.length;r++)s[r]=kn(s[r]/255)*255;return n.putImageData(i,0,0),e}else if(t.data){let e=t.data.slice(0);for(let n=0;n<e.length;n++)if(e instanceof Uint8Array||e instanceof Uint8ClampedArray)e[n]=Math.floor(kn(e[n]/255)*255);else e[n]=kn(e[n]);return{data:e,width:t.width,height:t.height}}else return dt("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}}var Ng=0;class Tn{constructor(t=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:Ng++}),this.uuid=nn(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){let e=this.data;if(typeof HTMLVideoElement<"u"&&e instanceof HTMLVideoElement)t.set(e.videoWidth,e.videoHeight,0);else if(typeof VideoFrame<"u"&&e instanceof VideoFrame)t.set(e.displayWidth,e.displayHeight,0);else if(e!==null)t.set(e.width,e.height,e.depth||0);else t.set(0,0,0);return t}set needsUpdate(t){if(t===!0)this.version++}toJSON(t){let e=t===void 0||typeof t==="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];let n={uuid:this.uuid,url:""},i=this.data;if(i!==null){let s;if(Array.isArray(i)){s=[];for(let r=0,a=i.length;r<a;r++)if(i[r].isDataTexture)s.push(bo(i[r].image));else s.push(bo(i[r]))}else s=bo(i);n.url=s}if(!e)t.images[this.uuid]=n;return n}}function bo(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap)return oc.getDataURL(t);else if(t.data)return{data:Array.from(t.data),width:t.width,height:t.height,type:t.data.constructor.name};else return dt("Texture: Unable to serialize Texture."),{}}class Wd extends Tn{constructor(t=null){Gn('Source: "Source" has been renamed to "TextureSource". Please update your code to use "THREE.TextureSource" instead.');super(t);this.isSource=!0}}var Ug=0,To=new R;class Se extends ln{constructor(t=Se.DEFAULT_IMAGE,e=Se.DEFAULT_MAPPING,n=1001,i=1001,s=1006,r=1008,a=1023,o=1009,l=Se.DEFAULT_ANISOTROPY,c=""){super();this.isTexture=!0,Object.defineProperty(this,"id",{value:Ug++}),this.uuid=nn(),this.name="",this.source=new Tn(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=i,this.magFilter=s,this.minFilter=r,this.anisotropy=l,this.format=a,this.internalFormat=null,this.type=o,this.offset=new j(0,0),this.repeat=new j(1,1),this.center=new j(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Xt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=c,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=t&&t.depth&&t.depth>1?!0:!1,this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(To).x}get height(){return this.source.getSize(To).y}get depth(){return this.source.getSize(To).z}get image(){return this.source.data}set image(t){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.normalized=t.normalized,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(let e in t){let n=t[e];if(n===void 0){dt(`Texture.setValues(): parameter '${e}' has value of undefined.`);continue}let i=this[e];if(i===void 0){dt(`Texture.setValues(): property '${e}' does not exist.`);continue}if(i&&n&&(i.isVector2&&n.isVector2))i.copy(n);else if(i&&n&&(i.isVector3&&n.isVector3))i.copy(n);else if(i&&n&&(i.isMatrix3&&n.isMatrix3))i.copy(n);else this[e]=n}}toJSON(t){let e=t===void 0||typeof t==="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];let n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};if(Object.keys(this.userData).length>0)n.userData=this.userData;if(!e)t.textures[this.uuid]=n;return n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==300)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case 1000:t.x=t.x-Math.floor(t.x);break;case 1001:t.x=t.x<0?0:1;break;case 1002:if(Math.abs(Math.floor(t.x)%2)===1)t.x=Math.ceil(t.x)-t.x;else t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case 1000:t.y=t.y-Math.floor(t.y);break;case 1001:t.y=t.y<0?0:1;break;case 1002:if(Math.abs(Math.floor(t.y)%2)===1)t.y=Math.ceil(t.y)-t.y;else t.y=t.y-Math.floor(t.y);break}if(this.flipY)t.y=1-t.y;return t}set needsUpdate(t){if(t===!0)this.version++,this.source.needsUpdate=!0}set needsPMREMUpdate(t){if(t===!0)this.pmremVersion++}}Se.DEFAULT_IMAGE=null;Se.DEFAULT_MAPPING=300;Se.DEFAULT_ANISOTROPY=1;class de{static{de.prototype.isVector4=!0}constructor(t=0,e=0,n=0,i=1){this.x=t,this.y=e,this.z=n,this.w=i}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,i){return this.x=t,this.y=e,this.z=n,this.w=i,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw Error("THREE.Vector4: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw Error("THREE.Vector4: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){let e=this.x,n=this.y,i=this.z,s=this.w,r=t.elements;return this.x=r[0]*e+r[4]*n+r[8]*i+r[12]*s,this.y=r[1]*e+r[5]*n+r[9]*i+r[13]*s,this.z=r[2]*e+r[6]*n+r[10]*i+r[14]*s,this.w=r[3]*e+r[7]*n+r[11]*i+r[15]*s,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);let e=Math.sqrt(1-t.w*t.w);if(e<0.0001)this.x=1,this.y=0,this.z=0;else this.x=t.x/e,this.y=t.y/e,this.z=t.z/e;return this}setAxisAngleFromRotationMatrix(t){let e,n,i,s,r=0.01,a=0.1,o=t.elements,l=o[0],c=o[4],h=o[8],d=o[1],u=o[5],f=o[9],m=o[2],_=o[6],g=o[10];if(Math.abs(c-d)<0.01&&Math.abs(h-m)<0.01&&Math.abs(f-_)<0.01){if(Math.abs(c+d)<0.1&&Math.abs(h+m)<0.1&&Math.abs(f+_)<0.1&&Math.abs(l+u+g-3)<0.1)return this.set(1,0,0,0),this;e=Math.PI;let S=(l+1)/2,E=(u+1)/2,x=(g+1)/2,T=(c+d)/4,C=(h+m)/4,w=(f+_)/4;if(S>E&&S>x)if(S<0.01)n=0,i=0.707106781,s=0.707106781;else n=Math.sqrt(S),i=T/n,s=C/n;else if(E>x)if(E<0.01)n=0.707106781,i=0,s=0.707106781;else i=Math.sqrt(E),n=T/i,s=w/i;else if(x<0.01)n=0.707106781,i=0.707106781,s=0;else s=Math.sqrt(x),n=C/s,i=w/s;return this.set(n,i,s,e),this}let p=Math.sqrt((_-f)*(_-f)+(h-m)*(h-m)+(d-c)*(d-c));if(Math.abs(p)<0.001)p=1;return this.x=(_-f)/p,this.y=(h-m)/p,this.z=(d-c)/p,this.w=Math.acos((l+u+g-1)/2),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=Ht(this.x,t.x,e.x),this.y=Ht(this.y,t.y,e.y),this.z=Ht(this.z,t.z,e.z),this.w=Ht(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=Ht(this.x,t,e),this.y=Ht(this.y,t,e),this.z=Ht(this.z,t,e),this.w=Ht(this.w,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Ht(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class wa extends ln{constructor(t=1,e=1,n={}){super();n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:1006,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=n.depth,this.scissor=new de(0,0,t,e),this.scissorTest=!1,this.viewport=new de(0,0,t,e),this.textures=[];let i={width:t,height:e,depth:n.depth},s=new Se(i),r=n.count;for(let a=0;a<r;a++)this.textures[a]=s.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveColorBuffer=n.resolveColorBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.storeMultisampledColorBuffer=n.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=n.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=n.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(t={}){let e={minFilter:1006,generateMipmaps:!1,flipY:!1,internalFormat:null};if(t.mapping!==void 0)e.mapping=t.mapping;if(t.wrapS!==void 0)e.wrapS=t.wrapS;if(t.wrapT!==void 0)e.wrapT=t.wrapT;if(t.wrapR!==void 0)e.wrapR=t.wrapR;if(t.magFilter!==void 0)e.magFilter=t.magFilter;if(t.minFilter!==void 0)e.minFilter=t.minFilter;if(t.format!==void 0)e.format=t.format;if(t.type!==void 0)e.type=t.type;if(t.anisotropy!==void 0)e.anisotropy=t.anisotropy;if(t.colorSpace!==void 0)e.colorSpace=t.colorSpace;if(t.flipY!==void 0)e.flipY=t.flipY;if(t.generateMipmaps!==void 0)e.generateMipmaps=t.generateMipmaps;if(t.internalFormat!==void 0)e.internalFormat=t.internalFormat;for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(e)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){if(this._depthTexture!==null&&this._depthTexture.renderTarget===this)this._depthTexture.renderTarget=null;if(t!==null&&t.renderTarget===null)t.renderTarget=this;this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let i=0,s=this.textures.length;i<s;i++)if(this.textures[i].image.width=t,this.textures[i].image.height=e,this.textures[i].image.depth=n,this.textures[i].isData3DTexture!==!0)this.textures[i].isArrayTexture=this.textures[i].image.depth>1;this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let e=0,n=t.textures.length;e<n;e++){this.textures[e]=t.textures[e].clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;let i=Object.assign({},t.textures[e].image);this.textures[e].source=new Tn(i)}if(this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveColorBuffer=t.resolveColorBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,this.storeMultisampledColorBuffer=t.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=t.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=t.storeMultisampledStencilBuffer,t.depthTexture!==null)if(t.depthTexture.renderTarget===t){let e=t.depthTexture.clone();e.renderTarget=null,this.depthTexture=e}else this.depthTexture=t.depthTexture;return this.samples=t.samples,this.multiview=t.multiview,this.useArrayDepthTexture=t.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Ce extends wa{constructor(t=1,e=1,n={}){super(t,e,n);this.isWebGLRenderTarget=!0}}class er extends Se{constructor(t=null,e=1,n=1,i=1){super(null);this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:i},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}}class Xd extends Ce{constructor(t=1,e=1,n=1,i={}){super(t,e,i);this.isWebGLArrayRenderTarget=!0,this.depth=n,this.texture=new er(null,t,e,n),this._setTextureOptions(i),this.texture.isRenderTargetTexture=!0}}class nr extends Se{constructor(t=null,e=1,n=1,i=1){super(null);this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:i},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}}class qd extends Ce{constructor(t=1,e=1,n=1,i={}){super(t,e,i);this.isWebGL3DRenderTarget=!0,this.depth=n,this.texture=new nr(null,t,e,n),this._setTextureOptions(i),this.texture.isRenderTargetTexture=!0}}class Vt{static{Vt.prototype.isMatrix4=!0}constructor(t,e,n,i,s,r,a,o,l,c,h,d,u,f,m,_){if(this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0)this.set(t,e,n,i,s,r,a,o,l,c,h,d,u,f,m,_)}set(t,e,n,i,s,r,a,o,l,c,h,d,u,f,m,_){let g=this.elements;return g[0]=t,g[4]=e,g[8]=n,g[12]=i,g[1]=s,g[5]=r,g[9]=a,g[13]=o,g[2]=l,g[6]=c,g[10]=h,g[14]=d,g[3]=u,g[7]=f,g[11]=m,g[15]=_,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Vt().fromArray(this.elements)}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){let e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){let e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){if(this.determinantAffine()===0)return t.set(1,0,0),e.set(0,1,0),n.set(0,0,1),this;return t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){if(t.determinantAffine()===0)return this.identity();let e=this.elements,n=t.elements,i=1/Hi.setFromMatrixColumn(t,0).length(),s=1/Hi.setFromMatrixColumn(t,1).length(),r=1/Hi.setFromMatrixColumn(t,2).length();return e[0]=n[0]*i,e[1]=n[1]*i,e[2]=n[2]*i,e[3]=0,e[4]=n[4]*s,e[5]=n[5]*s,e[6]=n[6]*s,e[7]=0,e[8]=n[8]*r,e[9]=n[9]*r,e[10]=n[10]*r,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){let e=this.elements,{x:n,y:i,z:s}=t,r=Math.cos(n),a=Math.sin(n),o=Math.cos(i),l=Math.sin(i),c=Math.cos(s),h=Math.sin(s);if(t.order==="XYZ"){let d=r*c,u=r*h,f=a*c,m=a*h;e[0]=o*c,e[4]=-o*h,e[8]=l,e[1]=u+f*l,e[5]=d-m*l,e[9]=-a*o,e[2]=m-d*l,e[6]=f+u*l,e[10]=r*o}else if(t.order==="YXZ"){let d=o*c,u=o*h,f=l*c,m=l*h;e[0]=d+m*a,e[4]=f*a-u,e[8]=r*l,e[1]=r*h,e[5]=r*c,e[9]=-a,e[2]=u*a-f,e[6]=m+d*a,e[10]=r*o}else if(t.order==="ZXY"){let d=o*c,u=o*h,f=l*c,m=l*h;e[0]=d-m*a,e[4]=-r*h,e[8]=f+u*a,e[1]=u+f*a,e[5]=r*c,e[9]=m-d*a,e[2]=-r*l,e[6]=a,e[10]=r*o}else if(t.order==="ZYX"){let d=r*c,u=r*h,f=a*c,m=a*h;e[0]=o*c,e[4]=f*l-u,e[8]=d*l+m,e[1]=o*h,e[5]=m*l+d,e[9]=u*l-f,e[2]=-l,e[6]=a*o,e[10]=r*o}else if(t.order==="YZX"){let d=r*o,u=r*l,f=a*o,m=a*l;e[0]=o*c,e[4]=m-d*h,e[8]=f*h+u,e[1]=h,e[5]=r*c,e[9]=-a*c,e[2]=-l*c,e[6]=u*h+f,e[10]=d-m*h}else if(t.order==="XZY"){let d=r*o,u=r*l,f=a*o,m=a*l;e[0]=o*c,e[4]=-h,e[8]=l*c,e[1]=d*h+m,e[5]=r*c,e[9]=u*h-f,e[2]=f*h-u,e[6]=a*c,e[10]=m*h+d}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(Dg,t,Fg)}lookAt(t,e,n){let i=this.elements;if(tn.subVectors(t,e),tn.lengthSq()===0)tn.z=1;if(tn.normalize(),Zn.crossVectors(n,tn),Zn.lengthSq()===0){if(Math.abs(n.z)===1)tn.x+=0.0001;else tn.z+=0.0001;tn.normalize(),Zn.crossVectors(n,tn)}return Zn.normalize(),Mr.crossVectors(tn,Zn),i[0]=Zn.x,i[4]=Mr.x,i[8]=tn.x,i[1]=Zn.y,i[5]=Mr.y,i[9]=tn.y,i[2]=Zn.z,i[6]=Mr.z,i[10]=tn.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,i=e.elements,s=this.elements,r=n[0],a=n[4],o=n[8],l=n[12],c=n[1],h=n[5],d=n[9],u=n[13],f=n[2],m=n[6],_=n[10],g=n[14],p=n[3],S=n[7],E=n[11],x=n[15],T=i[0],C=i[4],w=i[8],v=i[12],b=i[1],O=i[5],L=i[9],F=i[13],Z=i[2],P=i[6],G=i[10],J=i[14],k=i[3],at=i[7],W=i[11],Q=i[15];return s[0]=r*T+a*b+o*Z+l*k,s[4]=r*C+a*O+o*P+l*at,s[8]=r*w+a*L+o*G+l*W,s[12]=r*v+a*F+o*J+l*Q,s[1]=c*T+h*b+d*Z+u*k,s[5]=c*C+h*O+d*P+u*at,s[9]=c*w+h*L+d*G+u*W,s[13]=c*v+h*F+d*J+u*Q,s[2]=f*T+m*b+_*Z+g*k,s[6]=f*C+m*O+_*P+g*at,s[10]=f*w+m*L+_*G+g*W,s[14]=f*v+m*F+_*J+g*Q,s[3]=p*T+S*b+E*Z+x*k,s[7]=p*C+S*O+E*P+x*at,s[11]=p*w+S*L+E*G+x*W,s[15]=p*v+S*F+E*J+x*Q,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[4],i=t[8],s=t[12],r=t[1],a=t[5],o=t[9],l=t[13],c=t[2],h=t[6],d=t[10],u=t[14],f=t[3],m=t[7],_=t[11],g=t[15],p=o*u-l*d,S=a*u-l*h,E=a*d-o*h,x=r*u-l*c,T=r*d-o*c,C=r*h-a*c;return e*(m*p-_*S+g*E)-n*(f*p-_*x+g*T)+i*(f*S-m*x+g*C)-s*(f*E-m*T+_*C)}determinantAffine(){let t=this.elements,e=t[0],n=t[4],i=t[8],s=t[1],r=t[5],a=t[9],o=t[2],l=t[6],c=t[10];return e*(r*c-a*l)-n*(s*c-a*o)+i*(s*l-r*o)}transpose(){let t=this.elements,e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){let i=this.elements;if(t.isVector3)i[12]=t.x,i[13]=t.y,i[14]=t.z;else i[12]=t,i[13]=e,i[14]=n;return this}invert(){let t=this.elements,e=t[0],n=t[1],i=t[2],s=t[3],r=t[4],a=t[5],o=t[6],l=t[7],c=t[8],h=t[9],d=t[10],u=t[11],f=t[12],m=t[13],_=t[14],g=t[15],p=e*a-n*r,S=e*o-i*r,E=e*l-s*r,x=n*o-i*a,T=n*l-s*a,C=i*l-s*o,w=c*m-h*f,v=c*_-d*f,b=c*g-u*f,O=h*_-d*m,L=h*g-u*m,F=d*g-u*_,Z=p*F-S*L+E*O+x*b-T*v+C*w;if(Z===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let P=1/Z;return t[0]=(a*F-o*L+l*O)*P,t[1]=(i*L-n*F-s*O)*P,t[2]=(m*C-_*T+g*x)*P,t[3]=(d*T-h*C-u*x)*P,t[4]=(o*b-r*F-l*v)*P,t[5]=(e*F-i*b+s*v)*P,t[6]=(_*E-f*C-g*S)*P,t[7]=(c*C-d*E+u*S)*P,t[8]=(r*L-a*b+l*w)*P,t[9]=(n*b-e*L-s*w)*P,t[10]=(f*T-m*E+g*p)*P,t[11]=(h*E-c*T-u*p)*P,t[12]=(a*v-r*O-o*w)*P,t[13]=(e*O-n*v+i*w)*P,t[14]=(m*S-f*x-_*p)*P,t[15]=(c*x-h*S+d*p)*P,this}scale(t){let e=this.elements,{x:n,y:i,z:s}=t;return e[0]*=n,e[4]*=i,e[8]*=s,e[1]*=n,e[5]*=i,e[9]*=s,e[2]*=n,e[6]*=i,e[10]*=s,e[3]*=n,e[7]*=i,e[11]*=s,this}getMaxScaleOnAxis(){let t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],i=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,i))}makeTranslation(t,e,n){if(t.isVector3)this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1);else this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1);return this}makeRotationX(t){let e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){let n=Math.cos(e),i=Math.sin(e),s=1-n,{x:r,y:a,z:o}=t,l=s*r,c=s*a;return this.set(l*r+n,l*a-i*o,l*o+i*a,0,l*a+i*o,c*a+n,c*o-i*r,0,l*o-i*a,c*o+i*r,s*o*o+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,i,s,r){return this.set(1,n,s,0,t,1,r,0,e,i,1,0,0,0,0,1),this}compose(t,e,n){let i=this.elements,{_x:s,_y:r,_z:a,_w:o}=e,l=s+s,c=r+r,h=a+a,d=s*l,u=s*c,f=s*h,m=r*c,_=r*h,g=a*h,p=o*l,S=o*c,E=o*h,{x,y:T,z:C}=n;return i[0]=(1-(m+g))*x,i[1]=(u+E)*x,i[2]=(f-S)*x,i[3]=0,i[4]=(u-E)*T,i[5]=(1-(d+g))*T,i[6]=(_+p)*T,i[7]=0,i[8]=(f+S)*C,i[9]=(_-p)*C,i[10]=(1-(d+m))*C,i[11]=0,i[12]=t.x,i[13]=t.y,i[14]=t.z,i[15]=1,this}decompose(t,e,n){let i=this.elements;t.x=i[12],t.y=i[13],t.z=i[14];let s=this.determinantAffine();if(s===0)return n.set(1,1,1),e.identity(),this;let r=Hi.set(i[0],i[1],i[2]).length(),a=Hi.set(i[4],i[5],i[6]).length(),o=Hi.set(i[8],i[9],i[10]).length();if(s<0)r=-r;hn.copy(this);let l=1/r,c=1/a,h=1/o;return hn.elements[0]*=l,hn.elements[1]*=l,hn.elements[2]*=l,hn.elements[4]*=c,hn.elements[5]*=c,hn.elements[6]*=c,hn.elements[8]*=h,hn.elements[9]*=h,hn.elements[10]*=h,e.setFromRotationMatrix(hn),n.x=r,n.y=a,n.z=o,this}makePerspective(t,e,n,i,s,r,a=2000,o=!1){let l=this.elements,c=2*s/(e-t),h=2*s/(n-i),d=(e+t)/(e-t),u=(n+i)/(n-i),f,m;if(o)f=s/(r-s),m=r*s/(r-s);else if(a===2000)f=-(r+s)/(r-s),m=-2*r*s/(r-s);else if(a===2001)f=-r/(r-s),m=-r*s/(r-s);else throw Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return l[0]=c,l[4]=0,l[8]=d,l[12]=0,l[1]=0,l[5]=h,l[9]=u,l[13]=0,l[2]=0,l[6]=0,l[10]=f,l[14]=m,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(t,e,n,i,s,r,a=2000,o=!1){let l=this.elements,c=2/(e-t),h=2/(n-i),d=-(e+t)/(e-t),u=-(n+i)/(n-i),f,m;if(o)f=1/(r-s),m=r/(r-s);else if(a===2000)f=-2/(r-s),m=-(r+s)/(r-s);else if(a===2001)f=-1/(r-s),m=-s/(r-s);else throw Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return l[0]=c,l[4]=0,l[8]=0,l[12]=d,l[1]=0,l[5]=h,l[9]=0,l[13]=u,l[2]=0,l[6]=0,l[10]=f,l[14]=m,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(t){let e=this.elements,n=t.elements;for(let i=0;i<16;i++)if(e[i]!==n[i])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}}var Hi=new R,hn=new Vt,Dg=new R(0,0,0),Fg=new R(1,1,1),Zn=new R,Mr=new R,tn=new R,Lh=new Vt,Nh=new ke;class mn{constructor(t=0,e=0,n=0,i=mn.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=i}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,i=this._order){return this._x=t,this._y=e,this._z=n,this._order=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){let i=t.elements,s=i[0],r=i[4],a=i[8],o=i[1],l=i[5],c=i[9],h=i[2],d=i[6],u=i[10];switch(e){case"XYZ":if(this._y=Math.asin(Ht(a,-1,1)),Math.abs(a)<0.9999999)this._x=Math.atan2(-c,u),this._z=Math.atan2(-r,s);else this._x=Math.atan2(d,l),this._z=0;break;case"YXZ":if(this._x=Math.asin(-Ht(c,-1,1)),Math.abs(c)<0.9999999)this._y=Math.atan2(a,u),this._z=Math.atan2(o,l);else this._y=Math.atan2(-h,s),this._z=0;break;case"ZXY":if(this._x=Math.asin(Ht(d,-1,1)),Math.abs(d)<0.9999999)this._y=Math.atan2(-h,u),this._z=Math.atan2(-r,l);else this._y=0,this._z=Math.atan2(o,s);break;case"ZYX":if(this._y=Math.asin(-Ht(h,-1,1)),Math.abs(h)<0.9999999)this._x=Math.atan2(d,u),this._z=Math.atan2(o,s);else this._x=0,this._z=Math.atan2(-r,l);break;case"YZX":if(this._z=Math.asin(Ht(o,-1,1)),Math.abs(o)<0.9999999)this._x=Math.atan2(-c,l),this._y=Math.atan2(-h,s);else this._x=0,this._y=Math.atan2(a,u);break;case"XZY":if(this._z=Math.asin(-Ht(r,-1,1)),Math.abs(r)<0.9999999)this._x=Math.atan2(d,l),this._y=Math.atan2(a,s);else this._x=Math.atan2(-c,u),this._y=0;break;default:dt("Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}if(this._order=e,n===!0)this._onChangeCallback();return this}setFromQuaternion(t,e,n){return Lh.makeRotationFromQuaternion(t),this.setFromRotationMatrix(Lh,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return Nh.setFromEuler(this),this.setFromQuaternion(Nh,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){if(this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0)this._order=t[3];return this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}mn.DEFAULT_ORDER="XYZ";class ir{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}}var Og=0,Uh=new R,Vi=new ke,Nn=new Vt,br=new R,ws=new R,Bg=new R,zg=new ke,Dh=new R(1,0,0),Fh=new R(0,1,0),Oh=new R(0,0,1),Bh={type:"added"},Gg={type:"removed"},Wi={type:"childadded",child:null},Eo={type:"childremoved",child:null};class re extends ln{constructor(){super();this.isObject3D=!0,Object.defineProperty(this,"id",{value:Og++}),this.uuid=nn(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=re.DEFAULT_UP.clone();let t=new R,e=new mn,n=new ke,i=new R(1,1,1);function s(){n.setFromEuler(e,!1)}function r(){e.setFromQuaternion(n,void 0,!1)}e._onChange(s),n._onChange(r),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new Vt},normalMatrix:{value:new Xt}}),this.matrix=new Vt,this.matrixWorld=new Vt,this.matrixAutoUpdate=re.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=re.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new ir,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){if(this.matrixAutoUpdate)this.updateMatrix();this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return Vi.setFromAxisAngle(t,e),this.quaternion.multiply(Vi),this}rotateOnWorldAxis(t,e){return Vi.setFromAxisAngle(t,e),this.quaternion.premultiply(Vi),this}rotateX(t){return this.rotateOnAxis(Dh,t)}rotateY(t){return this.rotateOnAxis(Fh,t)}rotateZ(t){return this.rotateOnAxis(Oh,t)}translateOnAxis(t,e){return Uh.copy(t).applyQuaternion(this.quaternion),this.position.add(Uh.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(Dh,t)}translateY(t){return this.translateOnAxis(Fh,t)}translateZ(t){return this.translateOnAxis(Oh,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(Nn.copy(this.matrixWorld).invert())}lookAt(t,e,n){if(t.isVector3)br.copy(t);else br.set(t,e,n);let i=this.parent;if(this.updateWorldMatrix(!0,!1),ws.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight)Nn.lookAt(ws,br,this.up);else Nn.lookAt(br,ws,this.up);if(this.quaternion.setFromRotationMatrix(Nn),i)Nn.extractRotation(i.matrixWorld),Vi.setFromRotationMatrix(Nn),this.quaternion.premultiply(Vi.invert())}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}if(t===this)return Lt("Object3D.add: object can't be added as a child of itself.",t),this;if(t&&t.isObject3D)t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(Bh),Wi.child=t,this.dispatchEvent(Wi),Wi.child=null;else Lt("Object3D.add: object not an instance of THREE.Object3D.",t);return this}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let e=this.children.indexOf(t);if(e!==-1)t.parent=null,this.children.splice(e,1),t.dispatchEvent(Gg),Eo.child=t,this.dispatchEvent(Eo),Eo.child=null;return this}removeFromParent(){let t=this.parent;if(t!==null)t.remove(this);return this}clear(){return this.remove(...this.children)}attach(t){if(this.updateWorldMatrix(!0,!1),Nn.copy(this.matrixWorld).invert(),t.parent!==null)t.parent.updateWorldMatrix(!0,!1),Nn.multiply(t.parent.matrixWorld);return t.applyMatrix4(Nn),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(Bh),Wi.child=t,this.dispatchEvent(Wi),Wi.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,i=this.children.length;n<i;n++){let r=this.children[n].getObjectByProperty(t,e);if(r!==void 0)return r}return}getObjectsByProperty(t,e,n=[]){if(this[t]===e)n.push(this);let i=this.children;for(let s=0,r=i.length;s<r;s++)i[s].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ws,t,Bg),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ws,zg,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);let e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}intersectsFrustum(){}traverse(t){t(this);let e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);let e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].traverseVisible(t)}traverseAncestors(t){let e=this.parent;if(e!==null)t(e),e.traverseAncestors(t)}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let t=this.pivot;if(t!==null){let{x:e,y:n,z:i}=t,s=this.matrix.elements;s[12]+=e-s[0]*e-s[4]*n-s[8]*i,s[13]+=n-s[1]*e-s[5]*n-s[9]*i,s[14]+=i-s[2]*e-s[6]*n-s[10]*i}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){if(this.matrixAutoUpdate)this.updateMatrix();if(this.matrixWorldNeedsUpdate||t){if(this.matrixWorldAutoUpdate===!0)if(this.parent===null)this.matrixWorld.copy(this.matrix);else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix);this.matrixWorldNeedsUpdate=!1,t=!0}let e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e,n=!1){let i=this.parent;if(t===!0&&i!==null)i.updateWorldMatrix(!0,!1);if(this.matrixAutoUpdate)this.updateMatrix();if(this.matrixWorldNeedsUpdate||n){if(this.matrixWorldAutoUpdate===!0)if(this.parent===null)this.matrixWorld.copy(this.matrix);else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix);this.matrixWorldNeedsUpdate=!1,n=!0}if(e===!0){let s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].updateWorldMatrix(!1,!0,n)}}toJSON(t){let e=t===void 0||typeof t==="string",n={};if(e)t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"};let i={};if(i.uuid=this.uuid,i.type=this.type,i.name=this.name,i.castShadow=this.castShadow,i.receiveShadow=this.receiveShadow,i.visible=this.visible,i.frustumCulled=this.frustumCulled,i.renderOrder=this.renderOrder,i.static=this.static,i.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0)i.userData=this.userData;if(i.layers=this.layers.mask,i.matrix=this.matrix.toArray(),i.up=this.up.toArray(),this.pivot!==null)i.pivot=this.pivot.toArray();if(this.morphTargetDictionary!==void 0)i.morphTargetDictionary=Object.assign({},this.morphTargetDictionary);if(this.morphTargetInfluences!==void 0)i.morphTargetInfluences=this.morphTargetInfluences.slice();if(this.isInstancedMesh){if(i.type="InstancedMesh",i.count=this.count,i.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null)i.instanceColor=this.instanceColor.toJSON()}if(this.isBatchedMesh){if(i.type="BatchedMesh",i.perObjectFrustumCulled=this.perObjectFrustumCulled,i.sortObjects=this.sortObjects,i.drawRanges=this._drawRanges,i.reservedRanges=this._reservedRanges,i.geometryInfo=this._geometryInfo.map((a)=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),i.instanceInfo=this._instanceInfo.map((a)=>({...a})),i.availableInstanceIds=this._availableInstanceIds.slice(),i.availableGeometryIds=this._availableGeometryIds.slice(),i.nextIndexStart=this._nextIndexStart,i.nextVertexStart=this._nextVertexStart,i.geometryCount=this._geometryCount,i.maxInstanceCount=this._maxInstanceCount,i.maxVertexCount=this._maxVertexCount,i.maxIndexCount=this._maxIndexCount,i.geometryInitialized=this._geometryInitialized,i.matricesTexture=this._matricesTexture.toJSON(t),i.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null)i.colorsTexture=this._colorsTexture.toJSON(t);if(this.boundingSphere!==null)i.boundingSphere=this.boundingSphere.toJSON();if(this.boundingBox!==null)i.boundingBox=this.boundingBox.toJSON()}function s(a,o){if(a[o.uuid]===void 0)a[o.uuid]=o.toJSON(t);return o.uuid}if(this.isScene){if(this.background){if(this.background.isColor)i.background=this.background.toJSON();else if(this.background.isTexture)i.background=this.background.toJSON(t).uuid}if(this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0)i.environment=this.environment.toJSON(t).uuid}else if(this.isMesh||this.isLine||this.isPoints){i.geometry=s(t.geometries,this.geometry);let a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){let o=a.shapes;if(Array.isArray(o))for(let l=0,c=o.length;l<c;l++){let h=o[l];s(t.shapes,h)}else s(t.shapes,o)}}if(this.isSkinnedMesh){if(i.bindMode=this.bindMode,i.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0)s(t.skeletons,this.skeleton),i.skeleton=this.skeleton.uuid}if(this.material!==void 0)if(Array.isArray(this.material)){let a=[];for(let o=0,l=this.material.length;o<l;o++)a.push(s(t.materials,this.material[o]));i.material=a}else i.material=s(t.materials,this.material);if(this.children.length>0){i.children=[];for(let a=0;a<this.children.length;a++)i.children.push(this.children[a].toJSON(t).object)}if(this.animations.length>0){i.animations=[];for(let a=0;a<this.animations.length;a++){let o=this.animations[a];i.animations.push(s(t.animations,o))}}if(e){let a=r(t.geometries),o=r(t.materials),l=r(t.textures),c=r(t.images),h=r(t.shapes),d=r(t.skeletons),u=r(t.animations),f=r(t.nodes);if(a.length>0)n.geometries=a;if(o.length>0)n.materials=o;if(l.length>0)n.textures=l;if(c.length>0)n.images=c;if(h.length>0)n.shapes=h;if(d.length>0)n.skeletons=d;if(u.length>0)n.animations=u;if(f.length>0)n.nodes=f}return n.object=i,n;function r(a){let o=[];for(let l in a){let c=a[l];delete c.metadata,o.push(c)}return o}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.pivot=t.pivot!==null?t.pivot.clone():null,this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.static=t.static,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){let i=t.children[n];this.add(i.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}}re.DEFAULT_UP=new R(0,1,0);re.DEFAULT_MATRIX_AUTO_UPDATE=!0;re.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class bi extends re{constructor(){super();this.isGroup=!0,this.type="Group"}}var kg={type:"move"};class sr{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){if(this._hand===null)this._hand=new bi,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1};return this._hand}getTargetRaySpace(){if(this._targetRay===null)this._targetRay=new bi,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new R,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new R;return this._targetRay}getGripSpace(){if(this._grip===null)this._grip=new bi,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new R,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new R,this._grip.eventsEnabled=!1;return this._grip}dispatchEvent(t){if(this._targetRay!==null)this._targetRay.dispatchEvent(t);if(this._grip!==null)this._grip.dispatchEvent(t);if(this._hand!==null)this._hand.dispatchEvent(t);return this}connect(t){if(t&&t.hand){let e=this._hand;if(e)for(let n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){if(this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null)this._targetRay.visible=!1;if(this._grip!==null)this._grip.visible=!1;if(this._hand!==null)this._hand.visible=!1;return this}update(t,e,n){let i=null,s=null,r=null,a=this._targetRay,o=this._grip,l=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(l&&t.hand){r=!0;for(let m of t.hand.values()){let _=e.getJointPose(m,n),g=this._getHandJoint(l,m);if(_!==null)g.matrix.fromArray(_.transform.matrix),g.matrix.decompose(g.position,g.rotation,g.scale),g.matrixWorldNeedsUpdate=!0,g.jointRadius=_.radius;g.visible=_!==null}let c=l.joints["index-finger-tip"],h=l.joints["thumb-tip"],d=c.position.distanceTo(h.position),u=0.02,f=0.005;if(l.inputState.pinching&&d>u+f)l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this});else if(!l.inputState.pinching&&d<=u-f)l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this})}else if(o!==null&&t.gripSpace){if(s=e.getPose(t.gripSpace,n),s!==null){if(o.matrix.fromArray(s.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,s.linearVelocity)o.hasLinearVelocity=!0,o.linearVelocity.copy(s.linearVelocity);else o.hasLinearVelocity=!1;if(s.angularVelocity)o.hasAngularVelocity=!0,o.angularVelocity.copy(s.angularVelocity);else o.hasAngularVelocity=!1;if(o.eventsEnabled)o.dispatchEvent({type:"gripUpdated",data:t,target:this})}}if(a!==null){if(i=e.getPose(t.targetRaySpace,n),i===null&&s!==null)i=s;if(i!==null){if(a.matrix.fromArray(i.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,i.linearVelocity)a.hasLinearVelocity=!0,a.linearVelocity.copy(i.linearVelocity);else a.hasLinearVelocity=!1;if(i.angularVelocity)a.hasAngularVelocity=!0,a.angularVelocity.copy(i.angularVelocity);else a.hasAngularVelocity=!1;this.dispatchEvent(kg)}}}if(a!==null)a.visible=i!==null;if(o!==null)o.visible=s!==null;if(l!==null)l.visible=r!==null;return this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){let n=new bi;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}}var Yd={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Jn={h:0,s:0,l:0},Tr={h:0,s:0,l:0};function Ao(t,e,n){if(n<0)n+=1;if(n>1)n-=1;if(n<0.16666666666666666)return t+(e-t)*6*n;if(n<0.5)return e;if(n<0.6666666666666666)return t+(e-t)*6*(0.6666666666666666-n);return t}class _t{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){let i=t;if(i&&i.isColor)this.copy(i);else if(typeof i==="number")this.setHex(i);else if(typeof i==="string")this.setStyle(i)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e="srgb"){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,ne.colorSpaceToWorking(this,e),this}setRGB(t,e,n,i=ne.workingColorSpace){return this.r=t,this.g=e,this.b=n,ne.colorSpaceToWorking(this,i),this}setHSL(t,e,n,i=ne.workingColorSpace){if(t=ac(t,1),e=Ht(e,0,1),n=Ht(n,0,1),e===0)this.r=this.g=this.b=n;else{let s=n<=0.5?n*(1+e):n+e-n*e,r=2*n-s;this.r=Ao(r,s,t+0.3333333333333333),this.g=Ao(r,s,t),this.b=Ao(r,s,t-0.3333333333333333)}return ne.colorSpaceToWorking(this,i),this}setStyle(t,e="srgb"){function n(s){if(s===void 0)return;if(parseFloat(s)<1)dt("Color: Alpha component of "+t+" will be ignored.")}let i;if(i=/^(\w+)\(([^\)]*)\)/.exec(t)){let s,r=i[1],a=i[2];switch(r){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,e);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,e);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,e);break;default:dt("Color: Unknown color model "+t)}}else if(i=/^\#([A-Fa-f\d]+)$/.exec(t)){let s=i[1],r=s.length;if(r===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,e);else if(r===6)return this.setHex(parseInt(s,16),e);else dt("Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e="srgb"){let n=Yd[t.toLowerCase()];if(n!==void 0)this.setHex(n,e);else dt("Color: Unknown color "+t);return this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=kn(t.r),this.g=kn(t.g),this.b=kn(t.b),this}copyLinearToSRGB(t){return this.r=ls(t.r),this.g=ls(t.g),this.b=ls(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t="srgb"){return ne.workingToColorSpace(ze.copy(this),t),Math.round(Ht(ze.r*255,0,255))*65536+Math.round(Ht(ze.g*255,0,255))*256+Math.round(Ht(ze.b*255,0,255))}getHexString(t="srgb"){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=ne.workingColorSpace){ne.workingToColorSpace(ze.copy(this),e);let{r:n,g:i,b:s}=ze,r=Math.max(n,i,s),a=Math.min(n,i,s),o,l,c=(a+r)/2;if(a===r)o=0,l=0;else{let h=r-a;switch(l=c<=0.5?h/(r+a):h/(2-r-a),r){case n:o=(i-s)/h+(i<s?6:0);break;case i:o=(s-n)/h+2;break;case s:o=(n-i)/h+4;break}o/=6}return t.h=o,t.s=l,t.l=c,t}getRGB(t,e=ne.workingColorSpace){return ne.workingToColorSpace(ze.copy(this),e),t.r=ze.r,t.g=ze.g,t.b=ze.b,t}getStyle(t="srgb"){ne.workingToColorSpace(ze.copy(this),t);let{r:e,g:n,b:i}=ze;if(t!=="srgb")return`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${i.toFixed(3)})`;return`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(i*255)})`}offsetHSL(t,e,n){return this.getHSL(Jn),this.setHSL(Jn.h+t,Jn.s+e,Jn.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(Jn),t.getHSL(Tr);let n=ks(Jn.h,Tr.h,e),i=ks(Jn.s,Tr.s,e),s=ks(Jn.l,Tr.l,e);return this.setHSL(n,i,s),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){let e=this.r,n=this.g,i=this.b,s=t.elements;return this.r=s[0]*e+s[3]*n+s[6]*i,this.g=s[1]*e+s[4]*n+s[7]*i,this.b=s[2]*e+s[5]*n+s[8]*i,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}var ze=new _t;_t.NAMES=Yd;class Ca{constructor(t,e=0.00025){this.isFogExp2=!0,this.name="",this.color=new _t(t),this.density=e}clone(){return new Ca(this.color,this.density)}toJSON(){return{type:"FogExp2",name:this.name,color:this.color.getHex(),density:this.density}}}class Ra{constructor(t,e=1,n=1000){this.isFog=!0,this.name="",this.color=new _t(t),this.near=e,this.far=n}clone(){return new Ra(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}}class lc extends re{constructor(){super();if(this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new mn,this.environmentIntensity=1,this.environmentRotation=new mn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){if(super.copy(t,e),t.background!==null)this.background=t.background.clone();if(t.environment!==null)this.environment=t.environment.clone();if(t.fog!==null)this.fog=t.fog.clone();if(this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null)this.overrideMaterial=t.overrideMaterial.clone();return this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){let e=super.toJSON(t);if(this.fog!==null)e.object.fog=this.fog.toJSON();return e.object.backgroundBlurriness=this.backgroundBlurriness,e.object.backgroundIntensity=this.backgroundIntensity,e.object.backgroundRotation=this.backgroundRotation.toArray(),e.object.environmentIntensity=this.environmentIntensity,e.object.environmentRotation=this.environmentRotation.toArray(),e}}var un=new R,Un=new R,wo=new R,Dn=new R,Xi=new R,qi=new R,zh=new R,Co=new R,Ro=new R,Io=new R,Po=new de,Lo=new de,No=new de;class $e{constructor(t=new R,e=new R,n=new R){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,i){i.subVectors(n,e),un.subVectors(t,e),i.cross(un);let s=i.lengthSq();if(s>0)return i.multiplyScalar(1/Math.sqrt(s));return i.set(0,0,0)}static getBarycoord(t,e,n,i,s){un.subVectors(i,e),Un.subVectors(n,e),wo.subVectors(t,e);let r=un.dot(un),a=un.dot(Un),o=un.dot(wo),l=Un.dot(Un),c=Un.dot(wo),h=r*l-a*a;if(h===0)return s.set(0,0,0),null;let d=1/h,u=(l*o-a*c)*d,f=(r*c-a*o)*d;return s.set(1-u-f,f,u)}static containsPoint(t,e,n,i){if(this.getBarycoord(t,e,n,i,Dn)===null)return!1;return Dn.x>=0&&Dn.y>=0&&Dn.x+Dn.y<=1}static getInterpolation(t,e,n,i,s,r,a,o){if(this.getBarycoord(t,e,n,i,Dn)===null){if(o.x=0,o.y=0,"z"in o)o.z=0;if("w"in o)o.w=0;return null}return o.setScalar(0),o.addScaledVector(s,Dn.x),o.addScaledVector(r,Dn.y),o.addScaledVector(a,Dn.z),o}static getInterpolatedAttribute(t,e,n,i,s,r){return Po.setScalar(0),Lo.setScalar(0),No.setScalar(0),Po.fromBufferAttribute(t,e),Lo.fromBufferAttribute(t,n),No.fromBufferAttribute(t,i),r.setScalar(0),r.addScaledVector(Po,s.x),r.addScaledVector(Lo,s.y),r.addScaledVector(No,s.z),r}static isFrontFacing(t,e,n,i){return un.subVectors(n,e),Un.subVectors(t,e),un.cross(Un).dot(i)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,i){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[i]),this}setFromAttributeAndIndices(t,e,n,i){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,i),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return un.subVectors(this.c,this.b),Un.subVectors(this.a,this.b),un.cross(Un).length()*0.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(0.3333333333333333)}getNormal(t){return $e.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return $e.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,n,i,s){return $e.getInterpolation(t,this.a,this.b,this.c,e,n,i,s)}containsPoint(t){return $e.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return $e.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){let n=this.a,i=this.b,s=this.c,r,a;Xi.subVectors(i,n),qi.subVectors(s,n),Co.subVectors(t,n);let o=Xi.dot(Co),l=qi.dot(Co);if(o<=0&&l<=0)return e.copy(n);Ro.subVectors(t,i);let c=Xi.dot(Ro),h=qi.dot(Ro);if(c>=0&&h<=c)return e.copy(i);let d=o*h-c*l;if(d<=0&&o>=0&&c<=0)return r=o/(o-c),e.copy(n).addScaledVector(Xi,r);Io.subVectors(t,s);let u=Xi.dot(Io),f=qi.dot(Io);if(f>=0&&u<=f)return e.copy(s);let m=u*l-o*f;if(m<=0&&l>=0&&f<=0)return a=l/(l-f),e.copy(n).addScaledVector(qi,a);let _=c*f-u*h;if(_<=0&&h-c>=0&&u-f>=0)return zh.subVectors(s,i),a=(h-c)/(h-c+(u-f)),e.copy(i).addScaledVector(zh,a);let g=1/(_+m+d);return r=m*g,a=d*g,e.copy(n).addScaledVector(Xi,r).addScaledVector(qi,a)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}}class Fe{constructor(t=new R(1/0,1/0,1/0),e=new R(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint(dn.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint(dn.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){let n=dn.copy(e).multiplyScalar(0.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(0.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);let n=t.geometry;if(n!==void 0){let s=n.getAttribute("position");if(e===!0&&s!==void 0&&t.isInstancedMesh!==!0)for(let r=0,a=s.count;r<a;r++){if(t.isMesh===!0)t.getVertexPosition(r,dn);else dn.fromBufferAttribute(s,r);dn.applyMatrix4(t.matrixWorld),this.expandByPoint(dn)}else{if(t.boundingBox!==void 0){if(t.boundingBox===null)t.computeBoundingBox();Er.copy(t.boundingBox)}else{if(n.boundingBox===null)n.computeBoundingBox();Er.copy(n.boundingBox)}Er.applyMatrix4(t.matrixWorld),this.union(Er)}}let i=t.children;for(let s=0,r=i.length;s<r;s++)this.expandByObject(i[s],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,dn),dn.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;if(t.normal.x>0)e=t.normal.x*this.min.x,n=t.normal.x*this.max.x;else e=t.normal.x*this.max.x,n=t.normal.x*this.min.x;if(t.normal.y>0)e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y;else e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y;if(t.normal.z>0)e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z;else e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z;return e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(Cs),Ar.subVectors(this.max,Cs),Yi.subVectors(t.a,Cs),Zi.subVectors(t.b,Cs),Ji.subVectors(t.c,Cs),$n.subVectors(Zi,Yi),Kn.subVectors(Ji,Zi),ui.subVectors(Yi,Ji);let e=[0,-$n.z,$n.y,0,-Kn.z,Kn.y,0,-ui.z,ui.y,$n.z,0,-$n.x,Kn.z,0,-Kn.x,ui.z,0,-ui.x,-$n.y,$n.x,0,-Kn.y,Kn.x,0,-ui.y,ui.x,0];if(!Uo(e,Yi,Zi,Ji,Ar))return!1;if(e=[1,0,0,0,1,0,0,0,1],!Uo(e,Yi,Zi,Ji,Ar))return!1;return wr.crossVectors($n,Kn),e=[wr.x,wr.y,wr.z],Uo(e,Yi,Zi,Ji,Ar)}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,dn).distanceTo(t)}getBoundingSphere(t){if(this.isEmpty())t.makeEmpty();else this.getCenter(t.center),t.radius=this.getSize(dn).length()*0.5;return t}intersect(t){if(this.min.max(t.min),this.max.min(t.max),this.isEmpty())this.makeEmpty();return this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){if(this.isEmpty())return this;return Fn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),Fn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),Fn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),Fn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),Fn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),Fn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),Fn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),Fn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(Fn),this}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}}var Fn=[new R,new R,new R,new R,new R,new R,new R,new R],dn=new R,Er=new Fe,Yi=new R,Zi=new R,Ji=new R,$n=new R,Kn=new R,ui=new R,Cs=new R,Ar=new R,wr=new R,di=new R;function Uo(t,e,n,i,s){for(let r=0,a=t.length-3;r<=a;r+=3){di.fromArray(t,r);let o=s.x*Math.abs(di.x)+s.y*Math.abs(di.y)+s.z*Math.abs(di.z),l=e.dot(di),c=n.dot(di),h=i.dot(di);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>o)return!1}return!0}var zn=Hg();function Hg(){let t=new ArrayBuffer(4),e=new Float32Array(t),n=new Uint32Array(t),i=new Uint32Array(512),s=new Uint32Array(512);for(let l=0;l<256;++l){let c=l-127;if(c<-27)i[l]=0,i[l|256]=32768,s[l]=24,s[l|256]=24;else if(c<-14)i[l]=1024>>-c-14,i[l|256]=1024>>-c-14|32768,s[l]=-c-1,s[l|256]=-c-1;else if(c<=15)i[l]=c+15<<10,i[l|256]=c+15<<10|32768,s[l]=13,s[l|256]=13;else if(c<128)i[l]=31744,i[l|256]=64512,s[l]=24,s[l|256]=24;else i[l]=31744,i[l|256]=64512,s[l]=13,s[l|256]=13}let r=new Uint32Array(2048),a=new Uint32Array(64),o=new Uint32Array(64);for(let l=1;l<1024;++l){let c=l<<13,h=0;while((c&8388608)===0)c<<=1,h-=8388608;c&=-8388609,h+=947912704,r[l]=c|h}for(let l=1024;l<2048;++l)r[l]=939524096+(l-1024<<13);for(let l=1;l<31;++l)a[l]=l<<23;a[31]=1199570944,a[32]=2147483648;for(let l=33;l<63;++l)a[l]=2147483648+(l-32<<23);a[63]=3347054592;for(let l=1;l<64;++l)if(l!==32)o[l]=1024;return{floatView:e,uint32View:n,baseTable:i,shiftTable:s,mantissaTable:r,exponentTable:a,offsetTable:o}}function Je(t){if(Math.abs(t)>65504)dt("DataUtils.toHalfFloat(): Value out of range.");t=Ht(t,-65504,65504),zn.floatView[0]=t;let e=zn.uint32View[0],n=e>>23&511;return zn.baseTable[n]+((e&8388607)>>zn.shiftTable[n])}function zs(t){let e=t>>10;return zn.uint32View[0]=zn.mantissaTable[zn.offsetTable[e]+(t&1023)]+zn.exponentTable[e],zn.floatView[0]}class Zd{static toHalfFloat(t){return Je(t)}static fromHalfFloat(t){return zs(t)}}var we=new R,Cr=new j,Vg=0;class ce extends ln{constructor(t,e,n=!1){super();if(Array.isArray(t))throw TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Vg++}),this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=35044,this.updateRanges=[],this.gpuType=1015,this.version=0}onUploadCallback(){}set needsUpdate(t){if(t===!0)this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let i=0,s=this.itemSize;i<s;i++)this.array[t+i]=e.array[n+i];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)Cr.fromBufferAttribute(this,e),Cr.applyMatrix3(t),this.setXY(e,Cr.x,Cr.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)we.fromBufferAttribute(this,e),we.applyMatrix3(t),this.setXYZ(e,we.x,we.y,we.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)we.fromBufferAttribute(this,e),we.applyMatrix4(t),this.setXYZ(e,we.x,we.y,we.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)we.fromBufferAttribute(this,e),we.applyNormalMatrix(t),this.setXYZ(e,we.x,we.y,we.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)we.fromBufferAttribute(this,e),we.transformDirection(t),this.setXYZ(e,we.x,we.y,we.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];if(this.normalized)n=qe(n,this.array);return n}setComponent(t,e,n){if(this.normalized)n=Jt(n,this.array);return this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];if(this.normalized)e=qe(e,this.array);return e}setX(t,e){if(this.normalized)e=Jt(e,this.array);return this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];if(this.normalized)e=qe(e,this.array);return e}setY(t,e){if(this.normalized)e=Jt(e,this.array);return this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];if(this.normalized)e=qe(e,this.array);return e}setZ(t,e){if(this.normalized)e=Jt(e,this.array);return this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];if(this.normalized)e=qe(e,this.array);return e}setW(t,e){if(this.normalized)e=Jt(e,this.array);return this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){if(t*=this.itemSize,this.normalized)e=Jt(e,this.array),n=Jt(n,this.array);return this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,i){if(t*=this.itemSize,this.normalized)e=Jt(e,this.array),n=Jt(n,this.array),i=Jt(i,this.array);return this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=i,this}setXYZW(t,e,n,i,s){if(t*=this.itemSize,this.normalized)e=Jt(e,this.array),n=Jt(n,this.array),i=Jt(i,this.array),s=Jt(s,this.array);return this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=i,this.array[t+3]=s,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return t.name=this.name,t.usage=this.usage,t.gpuType=this.gpuType,t}dispose(){this.dispatchEvent({type:"dispose"})}}class Jd extends ce{constructor(t,e,n){super(new Int8Array(t),e,n)}}class $d extends ce{constructor(t,e,n){super(new Uint8Array(t),e,n)}}class Kd extends ce{constructor(t,e,n){super(new Uint8ClampedArray(t),e,n)}}class Qd extends ce{constructor(t,e,n){super(new Int16Array(t),e,n)}}class Ia extends ce{constructor(t,e,n){super(new Uint16Array(t),e,n)}}class jd extends ce{constructor(t,e,n){super(new Int32Array(t),e,n)}}class Pa extends ce{constructor(t,e,n){super(new Uint32Array(t),e,n)}}class tf extends ce{constructor(t,e,n){super(new Uint16Array(t),e,n);this.isFloat16BufferAttribute=!0}getX(t){let e=zs(this.array[t*this.itemSize]);if(this.normalized)e=qe(e,this.array);return e}setX(t,e){if(this.normalized)e=Jt(e,this.array);return this.array[t*this.itemSize]=Je(e),this}getY(t){let e=zs(this.array[t*this.itemSize+1]);if(this.normalized)e=qe(e,this.array);return e}setY(t,e){if(this.normalized)e=Jt(e,this.array);return this.array[t*this.itemSize+1]=Je(e),this}getZ(t){let e=zs(this.array[t*this.itemSize+2]);if(this.normalized)e=qe(e,this.array);return e}setZ(t,e){if(this.normalized)e=Jt(e,this.array);return this.array[t*this.itemSize+2]=Je(e),this}getW(t){let e=zs(this.array[t*this.itemSize+3]);if(this.normalized)e=qe(e,this.array);return e}setW(t,e){if(this.normalized)e=Jt(e,this.array);return this.array[t*this.itemSize+3]=Je(e),this}setXY(t,e,n){if(t*=this.itemSize,this.normalized)e=Jt(e,this.array),n=Jt(n,this.array);return this.array[t+0]=Je(e),this.array[t+1]=Je(n),this}setXYZ(t,e,n,i){if(t*=this.itemSize,this.normalized)e=Jt(e,this.array),n=Jt(n,this.array),i=Jt(i,this.array);return this.array[t+0]=Je(e),this.array[t+1]=Je(n),this.array[t+2]=Je(i),this}setXYZW(t,e,n,i,s){if(t*=this.itemSize,this.normalized)e=Jt(e,this.array),n=Jt(n,this.array),i=Jt(i,this.array),s=Jt(s,this.array);return this.array[t+0]=Je(e),this.array[t+1]=Je(n),this.array[t+2]=Je(i),this.array[t+3]=Je(s),this}}class Tt extends ce{constructor(t,e,n){super(new Float32Array(t),e,n)}}var Wg=new Fe,Rs=new R,Do=new R;class Ne{constructor(t=new R,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){let n=this.center;if(e!==void 0)n.copy(e);else Wg.setFromPoints(t).getCenter(n);let i=0;for(let s=0,r=t.length;s<r;s++)i=Math.max(i,n.distanceToSquared(t[s]));return this.radius=Math.sqrt(i),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){let e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){let n=this.center.distanceToSquared(t);if(e.copy(t),n>this.radius*this.radius)e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center);return e}getBoundingBox(t){if(this.isEmpty())return t.makeEmpty(),t;return t.set(this.center,this.center),t.expandByScalar(this.radius),t}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;Rs.subVectors(t,this.center);let e=Rs.lengthSq();if(e>this.radius*this.radius){let n=Math.sqrt(e),i=(n-this.radius)*0.5;this.center.addScaledVector(Rs,i/n),this.radius+=i}return this}union(t){if(t.isEmpty())return this;if(this.isEmpty())return this.copy(t),this;if(this.center.equals(t.center)===!0)this.radius=Math.max(this.radius,t.radius);else Do.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(Rs.copy(t.center).add(Do)),this.expandByPoint(Rs.copy(t.center).sub(Do));return this}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}}var Xg=0,on=new Vt,Fo=new re,$i=new R,en=new Fe,Is=new Fe,Pe=new R;class Wt extends ln{constructor(){super();this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Xg++}),this.uuid=nn(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(t){if(Array.isArray(t))this.index=new((ug(t))?Pa:Ia)(t,1);else this.index=t;return this}setIndirect(t,e=0){return this.indirect=t,this.indirectOffset=e,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){let e=this.attributes.position;if(e!==void 0)e.applyMatrix4(t),e.needsUpdate=!0;let n=this.attributes.normal;if(n!==void 0){let s=new Xt().getNormalMatrix(t);n.applyNormalMatrix(s),n.needsUpdate=!0}let i=this.attributes.tangent;if(i!==void 0)i.transformDirection(t),i.needsUpdate=!0;if(this.boundingBox!==null)this.computeBoundingBox();if(this.boundingSphere!==null)this.computeBoundingSphere();return this._transformed=!0,this}applyQuaternion(t){return on.makeRotationFromQuaternion(t),this.applyMatrix4(on),this}rotateX(t){return on.makeRotationX(t),this.applyMatrix4(on),this}rotateY(t){return on.makeRotationY(t),this.applyMatrix4(on),this}rotateZ(t){return on.makeRotationZ(t),this.applyMatrix4(on),this}translate(t,e,n){return on.makeTranslation(t,e,n),this.applyMatrix4(on),this}scale(t,e,n){return on.makeScale(t,e,n),this.applyMatrix4(on),this}lookAt(t){return Fo.lookAt(t),Fo.updateMatrix(),this.applyMatrix4(Fo.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter($i).negate(),this.translate($i.x,$i.y,$i.z),this}setFromPoints(t){let e=this.getAttribute("position");if(e===void 0){let n=[];for(let i=0,s=t.length;i<s;i++){let r=t[i];n.push(r.x,r.y,r.z||0)}this.setAttribute("position",new Tt(n,3))}else{let n=Math.min(t.length,e.count);for(let i=0;i<n;i++){let s=t[i];e.setXYZ(i,s.x,s.y,s.z||0)}if(t.length>e.count)dt("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry.");e.needsUpdate=!0}return this}computeBoundingBox(){if(this.boundingBox===null)this.boundingBox=new Fe;let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){Lt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new R(-1/0,-1/0,-1/0),new R(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,i=e.length;n<i;n++){let s=e[n];if(en.setFromBufferAttribute(s),this.morphTargetsRelative)Pe.addVectors(this.boundingBox.min,en.min),this.boundingBox.expandByPoint(Pe),Pe.addVectors(this.boundingBox.max,en.max),this.boundingBox.expandByPoint(Pe);else this.boundingBox.expandByPoint(en.min),this.boundingBox.expandByPoint(en.max)}}else this.boundingBox.makeEmpty();if(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))Lt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){if(this.boundingSphere===null)this.boundingSphere=new Ne;let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){Lt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new R,1/0);return}if(t){let n=this.boundingSphere.center;if(en.setFromBufferAttribute(t),e)for(let s=0,r=e.length;s<r;s++){let a=e[s];if(Is.setFromBufferAttribute(a),this.morphTargetsRelative)Pe.addVectors(en.min,Is.min),en.expandByPoint(Pe),Pe.addVectors(en.max,Is.max),en.expandByPoint(Pe);else en.expandByPoint(Is.min),en.expandByPoint(Is.max)}en.getCenter(n);let i=0;for(let s=0,r=t.count;s<r;s++)Pe.fromBufferAttribute(t,s),i=Math.max(i,n.distanceToSquared(Pe));if(e)for(let s=0,r=e.length;s<r;s++){let a=e[s],o=this.morphTargetsRelative;for(let l=0,c=a.count;l<c;l++){if(Pe.fromBufferAttribute(a,l),o)$i.fromBufferAttribute(t,l),Pe.add($i);i=Math.max(i,n.distanceToSquared(Pe))}}if(this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius))Lt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){Lt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let{position:n,normal:i,uv:s}=e,r=this.getAttribute("tangent");if(r===void 0||r.count!==n.count)r=new ce(new Float32Array(4*n.count),4),this.setAttribute("tangent",r);let a=[],o=[];for(let w=0;w<n.count;w++)a[w]=new R,o[w]=new R;let l=new R,c=new R,h=new R,d=new j,u=new j,f=new j,m=new R,_=new R;function g(w,v,b){l.fromBufferAttribute(n,w),c.fromBufferAttribute(n,v),h.fromBufferAttribute(n,b),d.fromBufferAttribute(s,w),u.fromBufferAttribute(s,v),f.fromBufferAttribute(s,b),c.sub(l),h.sub(l),u.sub(d),f.sub(d);let O=1/(u.x*f.y-f.x*u.y);if(!isFinite(O))return;m.copy(c).multiplyScalar(f.y).addScaledVector(h,-u.y).multiplyScalar(O),_.copy(h).multiplyScalar(u.x).addScaledVector(c,-f.x).multiplyScalar(O),a[w].add(m),a[v].add(m),a[b].add(m),o[w].add(_),o[v].add(_),o[b].add(_)}let p=this.groups;if(p.length===0)p=[{start:0,count:t.count}];for(let w=0,v=p.length;w<v;++w){let b=p[w],{start:O,count:L}=b;for(let F=O,Z=O+L;F<Z;F+=3)g(t.getX(F+0),t.getX(F+1),t.getX(F+2))}let S=new R,E=new R,x=new R,T=new R;function C(w){x.fromBufferAttribute(i,w),T.copy(x);let v=a[w];S.copy(v),S.sub(x.multiplyScalar(x.dot(v))).normalize(),E.crossVectors(T,v);let O=E.dot(o[w])<0?-1:1;r.setXYZW(w,S.x,S.y,S.z,O)}for(let w=0,v=p.length;w<v;++w){let b=p[w],{start:O,count:L}=b;for(let F=O,Z=O+L;F<Z;F+=3)C(t.getX(F+0)),C(t.getX(F+1)),C(t.getX(F+2))}this._transformed=!0}computeVertexNormals(){let t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0||n.count!==e.count)n=new ce(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let d=0,u=n.count;d<u;d++)n.setXYZ(d,0,0,0);let i=new R,s=new R,r=new R,a=new R,o=new R,l=new R,c=new R,h=new R;if(t)for(let d=0,u=t.count;d<u;d+=3){let f=t.getX(d+0),m=t.getX(d+1),_=t.getX(d+2);i.fromBufferAttribute(e,f),s.fromBufferAttribute(e,m),r.fromBufferAttribute(e,_),c.subVectors(r,s),h.subVectors(i,s),c.cross(h),a.fromBufferAttribute(n,f),o.fromBufferAttribute(n,m),l.fromBufferAttribute(n,_),a.add(c),o.add(c),l.add(c),n.setXYZ(f,a.x,a.y,a.z),n.setXYZ(m,o.x,o.y,o.z),n.setXYZ(_,l.x,l.y,l.z)}else for(let d=0,u=e.count;d<u;d+=3)i.fromBufferAttribute(e,d+0),s.fromBufferAttribute(e,d+1),r.fromBufferAttribute(e,d+2),c.subVectors(r,s),h.subVectors(i,s),c.cross(h),n.setXYZ(d+0,c.x,c.y,c.z),n.setXYZ(d+1,c.x,c.y,c.z),n.setXYZ(d+2,c.x,c.y,c.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)Pe.fromBufferAttribute(t,e),Pe.normalize(),t.setXYZ(e,Pe.x,Pe.y,Pe.z)}toNonIndexed(){function t(a,o){let{array:l,itemSize:c,normalized:h}=a,d=new l.constructor(o.length*c),u=0,f=0;for(let m=0,_=o.length;m<_;m++){if(a.isInterleavedBufferAttribute)u=o[m]*a.data.stride+a.offset;else u=o[m]*c;for(let g=0;g<c;g++)d[f++]=l[u++]}return new ce(d,c,h)}if(this.index===null)return dt("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let e=new Wt,n=this.index.array,i=this.attributes;for(let a in i){let o=i[a],l=t(o,n);e.setAttribute(a,l)}let s=this.morphAttributes;for(let a in s){let o=[],l=s[a];for(let c=0,h=l.length;c<h;c++){let d=l[c],u=t(d,n);o.push(u)}e.morphAttributes[a]=o}e.morphTargetsRelative=this.morphTargetsRelative;let r=this.groups;for(let a=0,o=r.length;a<o;a++){let l=r[a];e.addGroup(l.start,l.count,l.materialIndex)}return e}toJSON(){let t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,t.name=this.name,Object.keys(this.userData).length>0)t.userData=this.userData;if(this.parameters!==void 0&&this._transformed!==!0){let o=this.parameters;for(let l in o)if(o[l]!==void 0)t[l]=o[l];return t}t.data={attributes:{}};let e=this.index;if(e!==null)t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)};let n=this.attributes;for(let o in n){let l=n[o];t.data.attributes[o]=l.toJSON(t.data)}let i={},s=!1;for(let o in this.morphAttributes){let l=this.morphAttributes[o],c=[];for(let h=0,d=l.length;h<d;h++){let u=l[h];c.push(u.toJSON(t.data))}if(c.length>0)i[o]=c,s=!0}if(s)t.data.morphAttributes=i,t.data.morphTargetsRelative=this.morphTargetsRelative;let r=this.groups;if(r.length>0)t.data.groups=JSON.parse(JSON.stringify(r));let a=this.boundingSphere;if(a!==null)t.data.boundingSphere=a.toJSON();return t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let e={};this.name=t.name;let n=t.index;if(n!==null)this.setIndex(n.clone());let i=t.attributes;for(let l in i){let c=i[l];this.setAttribute(l,c.clone(e))}let s=t.morphAttributes;for(let l in s){let c=[],h=s[l];for(let d=0,u=h.length;d<u;d++)c.push(h[d].clone(e));this.morphAttributes[l]=c}this.morphTargetsRelative=t.morphTargetsRelative;let r=t.groups;for(let l=0,c=r.length;l<c;l++){let h=r[l];this.addGroup(h.start,h.count,h.materialIndex)}let a=t.boundingBox;if(a!==null)this.boundingBox=a.clone();let o=t.boundingSphere;if(o!==null)this.boundingSphere=o.clone();return this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this._transformed=t._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}}class vs{constructor(t,e){this.isInterleavedBuffer=!0,this.array=t,this.stride=e,this.count=t!==void 0?t.length/e:0,this.usage=35044,this.updateRanges=[],this.version=0,this.uuid=nn()}onUploadCallback(){}set needsUpdate(t){if(t===!0)this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.array=new t.array.constructor(t.array),this.count=t.count,this.stride=t.stride,this.usage=t.usage,this}copyAt(t,e,n){t*=this.stride,n*=e.stride;for(let i=0,s=this.stride;i<s;i++)this.array[t+i]=e.array[n+i];return this}set(t,e=0){return this.array.set(t,e),this}clone(t){if(t.arrayBuffers===void 0)t.arrayBuffers={};if(this.array.buffer._uuid===void 0)this.array.buffer._uuid=nn();if(t.arrayBuffers[this.array.buffer._uuid]===void 0)t.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer;let e=new this.array.constructor(t.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(e,this.stride);return n.setUsage(this.usage),n}onUpload(t){return this.onUploadCallback=t,this}toJSON(t){if(t.arrayBuffers===void 0)t.arrayBuffers={};if(this.array.buffer._uuid===void 0)this.array.buffer._uuid=nn();if(t.arrayBuffers[this.array.buffer._uuid]===void 0)t.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer));let e={uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride};return e.usage=this.usage,e}}var Xe=new R;class ei{constructor(t,e,n,i=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=t,this.itemSize=e,this.offset=n,this.normalized=i}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(t){this.data.needsUpdate=t}applyMatrix4(t){for(let e=0,n=this.data.count;e<n;e++)Xe.fromBufferAttribute(this,e),Xe.applyMatrix4(t),this.setXYZ(e,Xe.x,Xe.y,Xe.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)Xe.fromBufferAttribute(this,e),Xe.applyNormalMatrix(t),this.setXYZ(e,Xe.x,Xe.y,Xe.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)Xe.fromBufferAttribute(this,e),Xe.transformDirection(t),this.setXYZ(e,Xe.x,Xe.y,Xe.z);return this}getComponent(t,e){let n=this.array[t*this.data.stride+this.offset+e];if(this.normalized)n=qe(n,this.array);return n}setComponent(t,e,n){if(this.normalized)n=Jt(n,this.array);return this.data.array[t*this.data.stride+this.offset+e]=n,this}setX(t,e){if(this.normalized)e=Jt(e,this.array);return this.data.array[t*this.data.stride+this.offset]=e,this}setY(t,e){if(this.normalized)e=Jt(e,this.array);return this.data.array[t*this.data.stride+this.offset+1]=e,this}setZ(t,e){if(this.normalized)e=Jt(e,this.array);return this.data.array[t*this.data.stride+this.offset+2]=e,this}setW(t,e){if(this.normalized)e=Jt(e,this.array);return this.data.array[t*this.data.stride+this.offset+3]=e,this}getX(t){let e=this.data.array[t*this.data.stride+this.offset];if(this.normalized)e=qe(e,this.array);return e}getY(t){let e=this.data.array[t*this.data.stride+this.offset+1];if(this.normalized)e=qe(e,this.array);return e}getZ(t){let e=this.data.array[t*this.data.stride+this.offset+2];if(this.normalized)e=qe(e,this.array);return e}getW(t){let e=this.data.array[t*this.data.stride+this.offset+3];if(this.normalized)e=qe(e,this.array);return e}setXY(t,e,n){if(t=t*this.data.stride+this.offset,this.normalized)e=Jt(e,this.array),n=Jt(n,this.array);return this.data.array[t+0]=e,this.data.array[t+1]=n,this}setXYZ(t,e,n,i){if(t=t*this.data.stride+this.offset,this.normalized)e=Jt(e,this.array),n=Jt(n,this.array),i=Jt(i,this.array);return this.data.array[t+0]=e,this.data.array[t+1]=n,this.data.array[t+2]=i,this}setXYZW(t,e,n,i,s){if(t=t*this.data.stride+this.offset,this.normalized)e=Jt(e,this.array),n=Jt(n,this.array),i=Jt(i,this.array),s=Jt(s,this.array);return this.data.array[t+0]=e,this.data.array[t+1]=n,this.data.array[t+2]=i,this.data.array[t+3]=s,this}clone(t){if(t===void 0){Xs("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let e=[];for(let n=0;n<this.count;n++){let i=n*this.data.stride+this.offset;for(let s=0;s<this.itemSize;s++)e.push(this.data.array[i+s])}return new ce(new this.array.constructor(e),this.itemSize,this.normalized)}else{if(t.interleavedBuffers===void 0)t.interleavedBuffers={};if(t.interleavedBuffers[this.data.uuid]===void 0)t.interleavedBuffers[this.data.uuid]=this.data.clone(t);return new ei(t.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}}toJSON(t){if(t===void 0){Xs("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let e=[];for(let n=0;n<this.count;n++){let i=n*this.data.stride+this.offset;for(let s=0;s<this.itemSize;s++)e.push(this.data.array[i+s])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:e,normalized:this.normalized}}else{if(t.interleavedBuffers===void 0)t.interleavedBuffers={};if(t.interleavedBuffers[this.data.uuid]===void 0)t.interleavedBuffers[this.data.uuid]=this.data.toJSON(t);return{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}}var Oo=new R,qg=new R,Yg=new Xt;class bn{constructor(t=new R(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,i){return this.normal.set(t,e,n),this.constant=i,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){let i=Oo.subVectors(n,e).cross(qg.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(i,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){let t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e,n=!0){let i=t.delta(Oo),s=this.normal.dot(i);if(s===0){if(this.distanceToPoint(t.start)===0)return e.copy(t.start);return null}let r=-(t.start.dot(this.normal)+this.constant)/s;if(n===!0&&(r<0||r>1))return null;return e.copy(t.start).addScaledVector(i,r)}intersectsLine(t){let e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){let n=e||Yg.getNormalMatrix(t),i=this.coplanarPoint(Oo).applyMatrix4(t),s=this.normal.applyMatrix3(n).normalize();return this.constant=-i.dot(s),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(t){return this.normal.fromArray(t.normal),this.constant=t.constant,this}}var Zg=0;class Ue extends ln{constructor(){super();this.isMaterial=!0,Object.defineProperty(this,"id",{value:Zg++}),this.uuid=nn(),this.name="",this.type="Material",this.blending=1,this.side=0,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new _t(0,0,0),this.blendAlpha=0,this.depthFunc=3,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=519,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=7680,this.stencilZFail=7680,this.stencilZPass=7680,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){if(this._alphaTest>0!==t>0)this.version++;this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t===void 0)return;for(let e in t){let n=t[e];if(n===void 0){dt(`Material: parameter '${e}' has value of undefined.`);continue}let i=this[e];if(i===void 0){dt(`Material: '${e}' is not a property of THREE.${this.type}.`);continue}if(i&&i.isColor)i.set(n);else if(i&&i.isVector2&&(n&&n.isVector2)||i&&i.isEuler&&(n&&n.isEuler)||i&&i.isVector3&&(n&&n.isVector3))i.copy(n);else this[e]=n}}toJSON(t){let e=t===void 0||typeof t==="string";if(e)t={textures:{},images:{}};let n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};if(n.uuid=this.uuid,n.type=this.type,n.blending=this.blending,n.side=this.side,n.shadowSide=this.shadowSide,n.vertexColors=this.vertexColors,n.opacity=this.opacity,n.transparent=this.transparent,n.blendSrc=this.blendSrc,n.blendDst=this.blendDst,n.blendEquation=this.blendEquation,n.blendSrcAlpha=this.blendSrcAlpha,n.blendDstAlpha=this.blendDstAlpha,n.blendEquationAlpha=this.blendEquationAlpha,n.blendColor=this.blendColor.getHex(),n.blendAlpha=this.blendAlpha,n.depthFunc=this.depthFunc,n.depthTest=this.depthTest,n.depthWrite=this.depthWrite,n.colorWrite=this.colorWrite,n.clipIntersection=this.clipIntersection,n.clipShadows=this.clipShadows,n.stencilWriteMask=this.stencilWriteMask,n.stencilFunc=this.stencilFunc,n.stencilRef=this.stencilRef,n.stencilFuncMask=this.stencilFuncMask,n.stencilFail=this.stencilFail,n.stencilZFail=this.stencilZFail,n.stencilZPass=this.stencilZPass,n.stencilWrite=this.stencilWrite,n.polygonOffset=this.polygonOffset,n.polygonOffsetFactor=this.polygonOffsetFactor,n.polygonOffsetUnits=this.polygonOffsetUnits,n.dithering=this.dithering,n.alphaTest=this.alphaTest,n.alphaHash=this.alphaHash,n.alphaToCoverage=this.alphaToCoverage,n.premultipliedAlpha=this.premultipliedAlpha,n.forceSinglePass=this.forceSinglePass,n.allowOverride=this.allowOverride,n.visible=this.visible,n.toneMapped=this.toneMapped,n.name=this.name,this.color&&this.color.isColor)n.color=this.color.getHex();if(this.roughness!==void 0)n.roughness=this.roughness;if(this.metalness!==void 0)n.metalness=this.metalness;if(this.sheen!==void 0)n.sheen=this.sheen;if(this.sheenColor&&this.sheenColor.isColor)n.sheenColor=this.sheenColor.getHex();if(this.sheenRoughness!==void 0)n.sheenRoughness=this.sheenRoughness;if(this.emissive&&this.emissive.isColor)n.emissive=this.emissive.getHex();if(this.emissiveIntensity!==void 0)n.emissiveIntensity=this.emissiveIntensity;if(this.specular&&this.specular.isColor)n.specular=this.specular.getHex();if(this.specularIntensity!==void 0)n.specularIntensity=this.specularIntensity;if(this.specularColor&&this.specularColor.isColor)n.specularColor=this.specularColor.getHex();if(this.shininess!==void 0)n.shininess=this.shininess;if(this.clearcoat!==void 0)n.clearcoat=this.clearcoat;if(this.clearcoatRoughness!==void 0)n.clearcoatRoughness=this.clearcoatRoughness;if(this.clearcoatMap&&this.clearcoatMap.isTexture)n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid;if(this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture)n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid;if(this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture)n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray();if(this.sheenColorMap&&this.sheenColorMap.isTexture)n.sheenColorMap=this.sheenColorMap.toJSON(t).uuid;if(this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture)n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid;if(this.dispersion!==void 0)n.dispersion=this.dispersion;if(this.retroreflectivity!==void 0)n.retroreflectivity=this.retroreflectivity;if(this.iridescence!==void 0)n.iridescence=this.iridescence;if(this.iridescenceIOR!==void 0)n.iridescenceIOR=this.iridescenceIOR;if(this.iridescenceThicknessRange!==void 0)n.iridescenceThicknessRange=this.iridescenceThicknessRange;if(this.iridescenceMap&&this.iridescenceMap.isTexture)n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid;if(this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture)n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid;if(this.anisotropy!==void 0)n.anisotropy=this.anisotropy;if(this.anisotropyRotation!==void 0)n.anisotropyRotation=this.anisotropyRotation;if(this.anisotropyMap&&this.anisotropyMap.isTexture)n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid;if(this.map&&this.map.isTexture)n.map=this.map.toJSON(t).uuid;if(this.matcap&&this.matcap.isTexture)n.matcap=this.matcap.toJSON(t).uuid;if(this.alphaMap&&this.alphaMap.isTexture)n.alphaMap=this.alphaMap.toJSON(t).uuid;if(this.lightMap&&this.lightMap.isTexture)n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity;if(this.aoMap&&this.aoMap.isTexture)n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity;if(this.bumpMap&&this.bumpMap.isTexture)n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale;if(this.normalMap&&this.normalMap.isTexture)n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray();if(this.displacementMap&&this.displacementMap.isTexture)n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias;if(this.roughnessMap&&this.roughnessMap.isTexture)n.roughnessMap=this.roughnessMap.toJSON(t).uuid;if(this.metalnessMap&&this.metalnessMap.isTexture)n.metalnessMap=this.metalnessMap.toJSON(t).uuid;if(this.emissiveMap&&this.emissiveMap.isTexture)n.emissiveMap=this.emissiveMap.toJSON(t).uuid;if(this.specularMap&&this.specularMap.isTexture)n.specularMap=this.specularMap.toJSON(t).uuid;if(this.specularIntensityMap&&this.specularIntensityMap.isTexture)n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid;if(this.specularColorMap&&this.specularColorMap.isTexture)n.specularColorMap=this.specularColorMap.toJSON(t).uuid;if(this.envMap&&this.envMap.isTexture){if(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0)n.combine=this.combine}if(this.envMapRotation!==void 0)n.envMapRotation=this.envMapRotation.toArray();if(this.envMapIntensity!==void 0)n.envMapIntensity=this.envMapIntensity;if(this.reflectivity!==void 0)n.reflectivity=this.reflectivity;if(this.refractionRatio!==void 0)n.refractionRatio=this.refractionRatio;if(this.gradientMap&&this.gradientMap.isTexture)n.gradientMap=this.gradientMap.toJSON(t).uuid;if(this.transmission!==void 0)n.transmission=this.transmission;if(this.transmissionMap&&this.transmissionMap.isTexture)n.transmissionMap=this.transmissionMap.toJSON(t).uuid;if(this.thickness!==void 0)n.thickness=this.thickness;if(this.thicknessMap&&this.thicknessMap.isTexture)n.thicknessMap=this.thicknessMap.toJSON(t).uuid;if(this.attenuationDistance!==void 0)n.attenuationDistance=this.attenuationDistance;if(this.attenuationColor!==void 0)n.attenuationColor=this.attenuationColor.getHex();if(this.size!==void 0)n.size=this.size;if(this.sizeAttenuation!==void 0)n.sizeAttenuation=this.sizeAttenuation;if(Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0)n.clippingPlanes=this.clippingPlanes.map((s)=>s.toJSON());if(this.rotation!==void 0)n.rotation=this.rotation;if(this.depthPacking!==void 0)n.depthPacking=this.depthPacking;if(this.linewidth!==void 0)n.linewidth=this.linewidth;if(this.linecap!==void 0)n.linecap=this.linecap;if(this.linejoin!==void 0)n.linejoin=this.linejoin;if(this.dashSize!==void 0)n.dashSize=this.dashSize;if(this.gapSize!==void 0)n.gapSize=this.gapSize;if(this.scale!==void 0)n.scale=this.scale;if(this.wireframe!==void 0)n.wireframe=this.wireframe;if(this.wireframeLinewidth!==void 0)n.wireframeLinewidth=this.wireframeLinewidth;if(this.wireframeLinecap!==void 0)n.wireframeLinecap=this.wireframeLinecap;if(this.wireframeLinejoin!==void 0)n.wireframeLinejoin=this.wireframeLinejoin;if(this.flatShading!==void 0)n.flatShading=this.flatShading;if(this.fog!==void 0)n.fog=this.fog;if(Object.keys(this.userData).length>0)n.userData=this.userData;function i(s){let r=[];for(let a in s){let o=s[a];delete o.metadata,r.push(o)}return r}if(e){let s=i(t.textures),r=i(t.images);if(s.length>0)n.textures=s;if(r.length>0)n.images=r}return n}fromJSON(t,e){if(t.uuid!==void 0)this.uuid=t.uuid;if(t.name!==void 0)this.name=t.name;if(t.color!==void 0&&this.color!==void 0)this.color.setHex(t.color);if(t.roughness!==void 0)this.roughness=t.roughness;if(t.metalness!==void 0)this.metalness=t.metalness;if(t.sheen!==void 0)this.sheen=t.sheen;if(t.sheenColor!==void 0)this.sheenColor=new _t().setHex(t.sheenColor);if(t.sheenRoughness!==void 0)this.sheenRoughness=t.sheenRoughness;if(t.emissive!==void 0&&this.emissive!==void 0)this.emissive.setHex(t.emissive);if(t.specular!==void 0&&this.specular!==void 0)this.specular.setHex(t.specular);if(t.specularIntensity!==void 0)this.specularIntensity=t.specularIntensity;if(t.specularColor!==void 0&&this.specularColor!==void 0)this.specularColor.setHex(t.specularColor);if(t.shininess!==void 0)this.shininess=t.shininess;if(t.clearcoat!==void 0)this.clearcoat=t.clearcoat;if(t.clearcoatRoughness!==void 0)this.clearcoatRoughness=t.clearcoatRoughness;if(t.dispersion!==void 0)this.dispersion=t.dispersion;if(t.retroreflectivity!==void 0)this.retroreflectivity=t.retroreflectivity;if(t.iridescence!==void 0)this.iridescence=t.iridescence;if(t.iridescenceIOR!==void 0)this.iridescenceIOR=t.iridescenceIOR;if(t.iridescenceThicknessRange!==void 0)this.iridescenceThicknessRange=t.iridescenceThicknessRange;if(t.transmission!==void 0)this.transmission=t.transmission;if(t.thickness!==void 0)this.thickness=t.thickness;if(t.attenuationDistance!==void 0)this.attenuationDistance=t.attenuationDistance;if(t.attenuationColor!==void 0&&this.attenuationColor!==void 0)this.attenuationColor.setHex(t.attenuationColor);if(t.anisotropy!==void 0)this.anisotropy=t.anisotropy;if(t.anisotropyRotation!==void 0)this.anisotropyRotation=t.anisotropyRotation;if(t.fog!==void 0)this.fog=t.fog;if(t.flatShading!==void 0)this.flatShading=t.flatShading;if(t.blending!==void 0)this.blending=t.blending;if(t.combine!==void 0)this.combine=t.combine;if(t.side!==void 0)this.side=t.side;if(t.shadowSide!==void 0)this.shadowSide=t.shadowSide;if(t.opacity!==void 0)this.opacity=t.opacity;if(t.transparent!==void 0)this.transparent=t.transparent;if(t.alphaTest!==void 0)this.alphaTest=t.alphaTest;if(t.alphaHash!==void 0)this.alphaHash=t.alphaHash;if(t.depthFunc!==void 0)this.depthFunc=t.depthFunc;if(t.depthTest!==void 0)this.depthTest=t.depthTest;if(t.depthWrite!==void 0)this.depthWrite=t.depthWrite;if(t.colorWrite!==void 0)this.colorWrite=t.colorWrite;if(t.clippingPlanes!==void 0)this.clippingPlanes=t.clippingPlanes.map((n)=>new bn().fromJSON(n));if(t.clipIntersection!==void 0)this.clipIntersection=t.clipIntersection;if(t.clipShadows!==void 0)this.clipShadows=t.clipShadows;if(t.depthPacking!==void 0)this.depthPacking=t.depthPacking;if(t.blendSrc!==void 0)this.blendSrc=t.blendSrc;if(t.blendDst!==void 0)this.blendDst=t.blendDst;if(t.blendEquation!==void 0)this.blendEquation=t.blendEquation;if(t.blendSrcAlpha!==void 0)this.blendSrcAlpha=t.blendSrcAlpha;if(t.blendDstAlpha!==void 0)this.blendDstAlpha=t.blendDstAlpha;if(t.blendEquationAlpha!==void 0)this.blendEquationAlpha=t.blendEquationAlpha;if(t.blendColor!==void 0&&this.blendColor!==void 0)this.blendColor.setHex(t.blendColor);if(t.blendAlpha!==void 0)this.blendAlpha=t.blendAlpha;if(t.stencilWriteMask!==void 0)this.stencilWriteMask=t.stencilWriteMask;if(t.stencilFunc!==void 0)this.stencilFunc=t.stencilFunc;if(t.stencilRef!==void 0)this.stencilRef=t.stencilRef;if(t.stencilFuncMask!==void 0)this.stencilFuncMask=t.stencilFuncMask;if(t.stencilFail!==void 0)this.stencilFail=t.stencilFail;if(t.stencilZFail!==void 0)this.stencilZFail=t.stencilZFail;if(t.stencilZPass!==void 0)this.stencilZPass=t.stencilZPass;if(t.stencilWrite!==void 0)this.stencilWrite=t.stencilWrite;if(t.wireframe!==void 0)this.wireframe=t.wireframe;if(t.wireframeLinewidth!==void 0)this.wireframeLinewidth=t.wireframeLinewidth;if(t.wireframeLinecap!==void 0)this.wireframeLinecap=t.wireframeLinecap;if(t.wireframeLinejoin!==void 0)this.wireframeLinejoin=t.wireframeLinejoin;if(t.rotation!==void 0)this.rotation=t.rotation;if(t.linewidth!==void 0)this.linewidth=t.linewidth;if(t.linecap!==void 0)this.linecap=t.linecap;if(t.linejoin!==void 0)this.linejoin=t.linejoin;if(t.dashSize!==void 0)this.dashSize=t.dashSize;if(t.gapSize!==void 0)this.gapSize=t.gapSize;if(t.scale!==void 0)this.scale=t.scale;if(t.polygonOffset!==void 0)this.polygonOffset=t.polygonOffset;if(t.polygonOffsetFactor!==void 0)this.polygonOffsetFactor=t.polygonOffsetFactor;if(t.polygonOffsetUnits!==void 0)this.polygonOffsetUnits=t.polygonOffsetUnits;if(t.dithering!==void 0)this.dithering=t.dithering;if(t.alphaToCoverage!==void 0)this.alphaToCoverage=t.alphaToCoverage;if(t.premultipliedAlpha!==void 0)this.premultipliedAlpha=t.premultipliedAlpha;if(t.forceSinglePass!==void 0)this.forceSinglePass=t.forceSinglePass;if(t.allowOverride!==void 0)this.allowOverride=t.allowOverride;if(t.visible!==void 0)this.visible=t.visible;if(t.toneMapped!==void 0)this.toneMapped=t.toneMapped;if(t.userData!==void 0)this.userData=t.userData;if(t.vertexColors!==void 0)if(typeof t.vertexColors==="number")this.vertexColors=t.vertexColors>0;else this.vertexColors=t.vertexColors;if(t.size!==void 0)this.size=t.size;if(t.sizeAttenuation!==void 0)this.sizeAttenuation=t.sizeAttenuation;if(t.map!==void 0)this.map=e[t.map]||null;if(t.matcap!==void 0)this.matcap=e[t.matcap]||null;if(t.alphaMap!==void 0)this.alphaMap=e[t.alphaMap]||null;if(t.bumpMap!==void 0)this.bumpMap=e[t.bumpMap]||null;if(t.bumpScale!==void 0)this.bumpScale=t.bumpScale;if(t.normalMap!==void 0)this.normalMap=e[t.normalMap]||null;if(t.normalMapType!==void 0)this.normalMapType=t.normalMapType;if(t.normalScale!==void 0){let n=t.normalScale;if(Array.isArray(n)===!1)n=[n,n];this.normalScale=new j().fromArray(n)}if(t.displacementMap!==void 0)this.displacementMap=e[t.displacementMap]||null;if(t.displacementScale!==void 0)this.displacementScale=t.displacementScale;if(t.displacementBias!==void 0)this.displacementBias=t.displacementBias;if(t.roughnessMap!==void 0)this.roughnessMap=e[t.roughnessMap]||null;if(t.metalnessMap!==void 0)this.metalnessMap=e[t.metalnessMap]||null;if(t.emissiveMap!==void 0)this.emissiveMap=e[t.emissiveMap]||null;if(t.emissiveIntensity!==void 0)this.emissiveIntensity=t.emissiveIntensity;if(t.specularMap!==void 0)this.specularMap=e[t.specularMap]||null;if(t.specularIntensityMap!==void 0)this.specularIntensityMap=e[t.specularIntensityMap]||null;if(t.specularColorMap!==void 0)this.specularColorMap=e[t.specularColorMap]||null;if(t.envMap!==void 0)this.envMap=e[t.envMap]||null;if(t.envMapRotation!==void 0)this.envMapRotation.fromArray(t.envMapRotation);if(t.envMapIntensity!==void 0)this.envMapIntensity=t.envMapIntensity;if(t.reflectivity!==void 0)this.reflectivity=t.reflectivity;if(t.refractionRatio!==void 0)this.refractionRatio=t.refractionRatio;if(t.lightMap!==void 0)this.lightMap=e[t.lightMap]||null;if(t.lightMapIntensity!==void 0)this.lightMapIntensity=t.lightMapIntensity;if(t.aoMap!==void 0)this.aoMap=e[t.aoMap]||null;if(t.aoMapIntensity!==void 0)this.aoMapIntensity=t.aoMapIntensity;if(t.gradientMap!==void 0)this.gradientMap=e[t.gradientMap]||null;if(t.clearcoatMap!==void 0)this.clearcoatMap=e[t.clearcoatMap]||null;if(t.clearcoatRoughnessMap!==void 0)this.clearcoatRoughnessMap=e[t.clearcoatRoughnessMap]||null;if(t.clearcoatNormalMap!==void 0)this.clearcoatNormalMap=e[t.clearcoatNormalMap]||null;if(t.clearcoatNormalScale!==void 0)this.clearcoatNormalScale=new j().fromArray(t.clearcoatNormalScale);if(t.iridescenceMap!==void 0)this.iridescenceMap=e[t.iridescenceMap]||null;if(t.iridescenceThicknessMap!==void 0)this.iridescenceThicknessMap=e[t.iridescenceThicknessMap]||null;if(t.transmissionMap!==void 0)this.transmissionMap=e[t.transmissionMap]||null;if(t.thicknessMap!==void 0)this.thicknessMap=e[t.thicknessMap]||null;if(t.anisotropyMap!==void 0)this.anisotropyMap=e[t.anisotropyMap]||null;if(t.sheenColorMap!==void 0)this.sheenColorMap=e[t.sheenColorMap]||null;if(t.sheenRoughnessMap!==void 0)this.sheenRoughnessMap=e[t.sheenRoughnessMap]||null;return this}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;let e=t.clippingPlanes,n=null;if(e!==null){let i=e.length;n=Array(i);for(let s=0;s!==i;++s)n[s]=e[s].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.allowOverride=t.allowOverride,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){if(t===!0)this.version++}}class La extends Ue{constructor(t){super();this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new _t(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.rotation=t.rotation,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}}var Ki,Ps=new R,Qi=new R,ji=new R,ts=new j,Ls=new j,ef=new Vt,Rr=new R,Ns=new R,Ir=new R,Gh=new j,Bo=new j,kh=new j;class cc extends re{constructor(t=new La){super();if(this.isSprite=!0,this.type="Sprite",Ki===void 0){Ki=new Wt;let e=new Float32Array([-0.5,-0.5,0,0,0,0.5,-0.5,0,1,0,0.5,0.5,0,1,1,-0.5,0.5,0,0,1]),n=new vs(e,5);Ki.setIndex([0,1,2,0,2,3]),Ki.setAttribute("position",new ei(n,3,0,!1)),Ki.setAttribute("uv",new ei(n,2,3,!1))}this.geometry=Ki,this.material=t,this.center=new j(0.5,0.5),this.count=1}intersectsFrustum(t){return t.intersectsSprite(this)}raycast(t,e){if(t.camera===null)Lt('Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.');if(Qi.setFromMatrixScale(this.matrixWorld),ef.copy(t.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(t.camera.matrixWorldInverse,this.matrixWorld),ji.setFromMatrixPosition(this.modelViewMatrix),t.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1)Qi.multiplyScalar(-ji.z);let n=this.material.rotation,i,s;if(n!==0)s=Math.cos(n),i=Math.sin(n);let r=this.center;Pr(Rr.set(-0.5,-0.5,0),ji,r,Qi,i,s),Pr(Ns.set(0.5,-0.5,0),ji,r,Qi,i,s),Pr(Ir.set(0.5,0.5,0),ji,r,Qi,i,s),Gh.set(0,0),Bo.set(1,0),kh.set(1,1);let a=t.ray.intersectTriangle(Rr,Ns,Ir,!1,Ps);if(a===null){if(Pr(Ns.set(-0.5,0.5,0),ji,r,Qi,i,s),Bo.set(0,1),a=t.ray.intersectTriangle(Rr,Ir,Ns,!1,Ps),a===null)return}let o=t.ray.origin.distanceTo(Ps);if(o<t.near||o>t.far)return;e.push({distance:o,point:Ps.clone(),uv:$e.getInterpolation(Ps,Rr,Ns,Ir,Gh,Bo,kh,new j),face:null,object:this})}copy(t,e){if(super.copy(t,e),t.center!==void 0)this.center.copy(t.center);return this.material=t.material,this}}function Pr(t,e,n,i,s,r){if(ts.subVectors(t,n).addScalar(0.5).multiply(i),s!==void 0)Ls.x=r*ts.x-s*ts.y,Ls.y=s*ts.x+r*ts.y;else Ls.copy(ts);t.copy(e),t.x+=Ls.x,t.y+=Ls.y,t.applyMatrix4(ef)}var Lr=new R,Hh=new R;class hc extends re{constructor(){super();this.isLOD=!0,this._currentLevel=0,this.type="LOD",Object.defineProperties(this,{levels:{enumerable:!0,value:[]}}),this.autoUpdate=!0}copy(t){super.copy(t,!1);let e=t.levels;for(let n=0,i=e.length;n<i;n++){let s=e[n];this.addLevel(s.object.clone(),s.distance,s.hysteresis)}return this.autoUpdate=t.autoUpdate,this}addLevel(t,e=0,n=0){e=Math.abs(e);let i=this.levels,s;for(s=0;s<i.length;s++)if(e<i[s].distance)break;return i.splice(s,0,{distance:e,hysteresis:n,object:t}),this.add(t),this}removeLevel(t){let e=this.levels;for(let n=0;n<e.length;n++)if(e[n].distance===t){let i=e.splice(n,1);return this.remove(i[0].object),!0}return!1}getCurrentLevel(){return this._currentLevel}getObjectForDistance(t){let e=this.levels;if(e.length>0){let n,i;for(n=1,i=e.length;n<i;n++){let s=e[n].distance;if(e[n].object.visible)s-=s*e[n].hysteresis;if(t<s)break}return e[n-1].object}return null}raycast(t,e){if(this.levels.length>0){Lr.setFromMatrixPosition(this.matrixWorld);let i=t.ray.origin.distanceTo(Lr);this.getObjectForDistance(i).raycast(t,e)}}update(t){let e=this.levels;if(e.length>1){Lr.setFromMatrixPosition(t.matrixWorld),Hh.setFromMatrixPosition(this.matrixWorld);let n=Lr.distanceTo(Hh)/t.zoom;e[0].object.visible=!0;let i,s;for(i=1,s=e.length;i<s;i++){let r=e[i].distance;if(e[i].object.visible)r-=r*e[i].hysteresis;if(n>=r)e[i-1].object.visible=!1,e[i].object.visible=!0;else break}this._currentLevel=i-1;for(;i<s;i++)e[i].object.visible=!1}}toJSON(t){let e=super.toJSON(t);e.object.autoUpdate=this.autoUpdate,e.object.levels=[];let n=this.levels;for(let i=0,s=n.length;i<s;i++){let r=n[i];e.object.levels.push({object:r.object.uuid,distance:r.distance,hysteresis:r.hysteresis})}return e}}var On=new R,zo=new R,Nr=new R,Ur=new R;class Ni{constructor(t=new R,e=new R(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,On)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);let n=e.dot(this.direction);if(n<0)return e.copy(this.origin);return e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){let e=On.subVectors(t,this.origin).dot(this.direction);if(e<0)return this.origin.distanceToSquared(t);return On.copy(this.origin).addScaledVector(this.direction,e),On.distanceToSquared(t)}distanceSqToSegment(t,e,n,i){zo.copy(t).add(e).multiplyScalar(0.5),Nr.copy(e).sub(t).normalize(),Ur.copy(this.origin).sub(zo);let s=t.distanceTo(e)*0.5,r=-this.direction.dot(Nr),a=Ur.dot(this.direction),o=-Ur.dot(Nr),l=Ur.lengthSq(),c=Math.abs(1-r*r),h,d,u,f;if(c>0)if(h=r*o-a,d=r*a-o,f=s*c,h>=0)if(d>=-f)if(d<=f){let m=1/c;h*=m,d*=m,u=h*(h+r*d+2*a)+d*(r*h+d+2*o)+l}else d=s,h=Math.max(0,-(r*d+a)),u=-h*h+d*(d+2*o)+l;else d=-s,h=Math.max(0,-(r*d+a)),u=-h*h+d*(d+2*o)+l;else if(d<=-f)h=Math.max(0,-(-r*s+a)),d=h>0?-s:Math.min(Math.max(-s,-o),s),u=-h*h+d*(d+2*o)+l;else if(d<=f)h=0,d=Math.min(Math.max(-s,-o),s),u=d*(d+2*o)+l;else h=Math.max(0,-(r*s+a)),d=h>0?s:Math.min(Math.max(-s,-o),s),u=-h*h+d*(d+2*o)+l;else d=r>0?-s:s,h=Math.max(0,-(r*d+a)),u=-h*h+d*(d+2*o)+l;if(n)n.copy(this.origin).addScaledVector(this.direction,h);if(i)i.copy(zo).addScaledVector(Nr,d);return u}intersectSphere(t,e){if(t.radius<0)return null;On.subVectors(t.center,this.origin);let n=On.dot(this.direction),i=On.dot(On)-n*n,s=t.radius*t.radius;if(i>s)return null;let r=Math.sqrt(s-i),a=n-r,o=n+r;if(o<0)return null;if(a<0)return this.at(o,e);return this.at(a,e)}intersectsSphere(t){if(t.radius<0)return!1;return this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){let e=t.normal.dot(this.direction);if(e===0){if(t.distanceToPoint(this.origin)===0)return 0;return null}let n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){let n=this.distanceToPlane(t);if(n===null)return null;return this.at(n,e)}intersectsPlane(t){let e=t.distanceToPoint(this.origin);if(e===0)return!0;if(t.normal.dot(this.direction)*e<0)return!0;return!1}intersectBox(t,e){let n,i,s,r,a,o,l=1/this.direction.x,c=1/this.direction.y,h=1/this.direction.z,d=this.origin;if(l>=0)n=(t.min.x-d.x)*l,i=(t.max.x-d.x)*l;else n=(t.max.x-d.x)*l,i=(t.min.x-d.x)*l;if(c>=0)s=(t.min.y-d.y)*c,r=(t.max.y-d.y)*c;else s=(t.max.y-d.y)*c,r=(t.min.y-d.y)*c;if(n>r||s>i)return null;if(s>n||isNaN(n))n=s;if(r<i||isNaN(i))i=r;if(h>=0)a=(t.min.z-d.z)*h,o=(t.max.z-d.z)*h;else a=(t.max.z-d.z)*h,o=(t.min.z-d.z)*h;if(n>o||a>i)return null;if(a>n||n!==n)n=a;if(o<i||i!==i)i=o;if(i<0)return null;return this.at(n>=0?n:i,e)}intersectsBox(t){return this.intersectBox(t,On)!==null}intersectTriangle(t,e,n,i,s){let r=this.origin,a=this.direction,{x:o,y:l,z:c}=a,h=t.x-r.x,d=t.y-r.y,u=t.z-r.z,f=e.x-r.x,m=e.y-r.y,_=e.z-r.z,g=n.x-r.x,p=n.y-r.y,S=n.z-r.z,E=Math.abs(o),x=Math.abs(l),T=Math.abs(c),C,w,v,b,O,L,F,Z,P,G,J,k;if(E>=x&&E>=T)if(v=o,L=h,P=f,k=g,o>=0)C=l,w=c,b=d,O=u,F=m,Z=_,G=p,J=S;else C=c,w=l,b=u,O=d,F=_,Z=m,G=S,J=p;else if(x>=T)if(v=l,L=d,P=m,k=p,l>=0)C=c,w=o,b=u,O=h,F=_,Z=f,G=S,J=g;else C=o,w=c,b=h,O=u,F=f,Z=_,G=g,J=S;else if(v=c,L=u,P=_,k=S,c>=0)C=o,w=l,b=h,O=d,F=f,Z=m,G=g,J=p;else C=l,w=o,b=d,O=h,F=m,Z=f,G=p,J=g;if(v===0)return null;let at=C/v,W=w/v,Q=1/v,it=b-at*L,Dt=O-W*L,Ft=F-at*P,he=Z-W*P,$t=G-at*k,q=J-W*k,lt=$t*he-q*Ft,rt=it*q-Dt*$t,Ot=Ft*Dt-he*it;if(i){if(lt<0||rt<0||Ot<0)return null}else if((lt<0||rt<0||Ot<0)&&(lt>0||rt>0||Ot>0))return null;let Gt=lt+rt+Ot;if(Gt===0)return null;let Ct=Q*(lt*L+rt*P+Ot*k);if(Gt>0?Ct<0:Ct>0)return null;return this.at(Ct/Gt,s)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class xn extends Ue{constructor(t){super();this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new _t(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new mn,this.combine=0,this.reflectivity=1,this.refractionRatio=0.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}}var Vh=new Vt,fi=new Ni,Dr=new Ne,Wh=new R,Fr=new R,Or=new R,Br=new R,Go=new R,zr=new R,Xh=new R,Gr=new R;class Me extends re{constructor(t=new Wt,e=new xn){super();this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,e){if(super.copy(t,e),t.morphTargetInfluences!==void 0)this.morphTargetInfluences=t.morphTargetInfluences.slice();if(t.morphTargetDictionary!==void 0)this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary);return this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let i=e[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,r=i.length;s<r;s++){let a=i[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}getVertexPosition(t,e){let n=this.geometry,i=n.attributes.position,s=n.morphAttributes.position,r=n.morphTargetsRelative;e.fromBufferAttribute(i,t);let a=this.morphTargetInfluences;if(s&&a){zr.set(0,0,0);for(let o=0,l=s.length;o<l;o++){let c=a[o],h=s[o];if(c===0)continue;if(Go.fromBufferAttribute(h,t),r)zr.addScaledVector(Go,c);else zr.addScaledVector(Go.sub(e),c)}e.add(zr)}return e}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let n=this.geometry,i=this.material,s=this.matrixWorld;if(i===void 0)return;if(n.boundingSphere===null)n.computeBoundingSphere();if(Dr.copy(n.boundingSphere),Dr.applyMatrix4(s),fi.copy(t.ray).recast(t.near),Dr.containsPoint(fi.origin)===!1){if(fi.intersectSphere(Dr,Wh)===null)return;if(fi.origin.distanceToSquared(Wh)>(t.far-t.near)**2)return}if(Vh.copy(s).invert(),fi.copy(t.ray).applyMatrix4(Vh),n.boundingBox!==null){if(fi.intersectsBox(n.boundingBox)===!1)return}this._computeIntersections(t,e,fi)}_computeIntersections(t,e,n){let i,s=this.geometry,r=this.material,a=s.index,o=s.attributes.position,l=s.attributes.uv,c=s.attributes.uv1,h=s.attributes.normal,{groups:d,drawRange:u}=s;if(a!==null)if(Array.isArray(r))for(let f=0,m=d.length;f<m;f++){let _=d[f],g=r[_.materialIndex],p=Math.max(_.start,u.start),S=Math.min(a.count,Math.min(_.start+_.count,u.start+u.count));for(let E=p,x=S;E<x;E+=3){let T=a.getX(E),C=a.getX(E+1),w=a.getX(E+2);if(i=kr(this,g,t,n,l,c,h,T,C,w),i)i.faceIndex=Math.floor(E/3),i.face.materialIndex=_.materialIndex,e.push(i)}}else{let f=Math.max(0,u.start),m=Math.min(a.count,u.start+u.count);for(let _=f,g=m;_<g;_+=3){let p=a.getX(_),S=a.getX(_+1),E=a.getX(_+2);if(i=kr(this,r,t,n,l,c,h,p,S,E),i)i.faceIndex=Math.floor(_/3),e.push(i)}}else if(o!==void 0)if(Array.isArray(r))for(let f=0,m=d.length;f<m;f++){let _=d[f],g=r[_.materialIndex],p=Math.max(_.start,u.start),S=Math.min(o.count,Math.min(_.start+_.count,u.start+u.count));for(let E=p,x=S;E<x;E+=3){let T=E,C=E+1,w=E+2;if(i=kr(this,g,t,n,l,c,h,T,C,w),i)i.faceIndex=Math.floor(E/3),i.face.materialIndex=_.materialIndex,e.push(i)}}else{let f=Math.max(0,u.start),m=Math.min(o.count,u.start+u.count);for(let _=f,g=m;_<g;_+=3){let p=_,S=_+1,E=_+2;if(i=kr(this,r,t,n,l,c,h,p,S,E),i)i.faceIndex=Math.floor(_/3),e.push(i)}}}}function Jg(t,e,n,i,s,r,a,o){let l;if(e.side===1)l=i.intersectTriangle(a,r,s,!0,o);else l=i.intersectTriangle(s,r,a,e.side===0,o);if(l===null)return null;Gr.copy(o),Gr.applyMatrix4(t.matrixWorld);let c=n.ray.origin.distanceTo(Gr);if(c<n.near||c>n.far)return null;return{distance:c,point:Gr.clone(),object:t}}function kr(t,e,n,i,s,r,a,o,l,c){t.getVertexPosition(o,Fr),t.getVertexPosition(l,Or),t.getVertexPosition(c,Br);let h=Jg(t,e,n,i,Fr,Or,Br,Xh);if(h){let d=new R;if($e.getBarycoord(Xh,Fr,Or,Br,d),s)h.uv=$e.getInterpolatedAttribute(s,o,l,c,d,new j);if(r)h.uv1=$e.getInterpolatedAttribute(r,o,l,c,d,new j);if(a){if(h.normal=$e.getInterpolatedAttribute(a,o,l,c,d,new R),h.normal.dot(i.direction)>0)h.normal.multiplyScalar(-1)}let u={a:o,b:l,c,normal:new R,materialIndex:0};$e.getNormal(Fr,Or,Br,u.normal),h.face=u,h.barycoord=d}return h}var Us=new de,qh=new de,Yh=new de,$g=new de,Zh=new Vt,Hr=new R,ko=new Ne,Jh=new Vt,Ho=new Ni;class uc extends Me{constructor(t,e){super(t,e);this.isSkinnedMesh=!0,this.type="SkinnedMesh",this.bindMode="attached",this.bindMatrix=new Vt,this.bindMatrixInverse=new Vt,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){let t=this.geometry;if(this.boundingBox===null)this.boundingBox=new Fe;this.boundingBox.makeEmpty();let e=t.getAttribute("position");for(let n=0;n<e.count;n++)this.getVertexPosition(n,Hr),this.boundingBox.expandByPoint(Hr)}computeBoundingSphere(){let t=this.geometry;if(this.boundingSphere===null)this.boundingSphere=new Ne;this.boundingSphere.makeEmpty();let e=t.getAttribute("position");for(let n=0;n<e.count;n++)this.getVertexPosition(n,Hr),this.boundingSphere.expandByPoint(Hr)}copy(t,e){if(super.copy(t,e),this.bindMode=t.bindMode,this.bindMatrix.copy(t.bindMatrix),this.bindMatrixInverse.copy(t.bindMatrixInverse),this.skeleton=t.skeleton,t.boundingBox!==null)this.boundingBox=t.boundingBox.clone();if(t.boundingSphere!==null)this.boundingSphere=t.boundingSphere.clone();return this}raycast(t,e){let n=this.material,i=this.matrixWorld;if(n===void 0)return;if(this.boundingSphere===null)this.computeBoundingSphere();if(ko.copy(this.boundingSphere),ko.applyMatrix4(i),t.ray.intersectsSphere(ko)===!1)return;if(Jh.copy(i).invert(),Ho.copy(t.ray).applyMatrix4(Jh),this.boundingBox!==null){if(Ho.intersectsBox(this.boundingBox)===!1)return}this._computeIntersections(t,e,Ho)}getVertexPosition(t,e){return super.getVertexPosition(t,e),this.applyBoneTransform(t,e),e}bind(t,e){if(this.skeleton=t,e===void 0)this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),e=this.matrixWorld;this.bindMatrix.copy(e),this.bindMatrixInverse.copy(e).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){let t=new de,e=this.geometry.attributes.skinWeight;for(let n=0,i=e.count;n<i;n++){t.fromBufferAttribute(e,n);let s=1/t.manhattanLength();if(s!==1/0)t.multiplyScalar(s);else t.set(1,0,0,0);e.setXYZW(n,t.x,t.y,t.z,t.w)}}updateMatrixWorld(t){if(super.updateMatrixWorld(t),this.bindMode==="attached")this.bindMatrixInverse.copy(this.matrixWorld).invert();else if(this.bindMode==="detached")this.bindMatrixInverse.copy(this.bindMatrix).invert();else dt("SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}applyBoneTransform(t,e){let n=this.skeleton,i=this.geometry;if(qh.fromBufferAttribute(i.attributes.skinIndex,t),Yh.fromBufferAttribute(i.attributes.skinWeight,t),e.isVector4)Us.copy(e),e.set(0,0,0,0);else Us.set(...e,1),e.set(0,0,0);Us.applyMatrix4(this.bindMatrix);for(let s=0;s<4;s++){let r=Yh.getComponent(s);if(r!==0){let a=qh.getComponent(s);Zh.multiplyMatrices(n.bones[a].matrixWorld,n.boneInverses[a]),e.addScaledVector($g.copy(Us).applyMatrix4(Zh),r)}}if(e.isVector4)e.w=Us.w;return e.applyMatrix4(this.bindMatrixInverse)}}class Na extends re{constructor(){super();this.isBone=!0,this.type="Bone"}}class sn extends Se{constructor(t=null,e=1,n=1,i,s,r,a,o,l=1003,c=1003,h,d){super(null,r,a,o,l,c,i,s,h,d);this.isDataTexture=!0,this.image={data:t,width:e,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}var $h=new Vt,Kg=new Vt;class Ua{constructor(t=[],e=[]){this.uuid=nn(),this.bones=t.slice(0),this.boneInverses=e,this.boneMatrices=null,this.boneTexture=null,this.init()}init(){let t=this.bones,e=this.boneInverses;if(this.boneMatrices=new Float32Array(t.length*16),e.length===0)this.calculateInverses();else if(t.length!==e.length){dt("Skeleton: Number of inverse bone matrices does not match amount of bones."),this.boneInverses=[];for(let n=0,i=this.bones.length;n<i;n++)this.boneInverses.push(new Vt)}}calculateInverses(){this.boneInverses.length=0;for(let t=0,e=this.bones.length;t<e;t++){let n=new Vt;if(this.bones[t])n.copy(this.bones[t].matrixWorld).invert();this.boneInverses.push(n)}}pose(){for(let t=0,e=this.bones.length;t<e;t++){let n=this.bones[t];if(n)n.matrixWorld.copy(this.boneInverses[t]).invert()}for(let t=0,e=this.bones.length;t<e;t++){let n=this.bones[t];if(n){if(n.parent&&n.parent.isBone)n.matrix.copy(n.parent.matrixWorld).invert(),n.matrix.multiply(n.matrixWorld);else n.matrix.copy(n.matrixWorld);n.matrix.decompose(n.position,n.quaternion,n.scale)}}}update(){let t=this.bones,e=this.boneInverses,n=this.boneMatrices,i=this.boneTexture;for(let s=0,r=t.length;s<r;s++){let a=t[s]?t[s].matrixWorld:Kg;$h.multiplyMatrices(a,e[s]),$h.toArray(n,s*16)}if(i!==null)i.needsUpdate=!0}clone(){return new Ua(this.bones,this.boneInverses)}computeBoneTexture(){let t=Math.sqrt(this.bones.length*4);t=Math.ceil(t/4)*4,t=Math.max(t,4);let e=new Float32Array(t*t*4);e.set(this.boneMatrices);let n=new sn(e,t,t,1023,1015);return n.needsUpdate=!0,this.boneMatrices=e,this.boneTexture=n,this}getBoneByName(t){for(let e=0,n=this.bones.length;e<n;e++){let i=this.bones[e];if(i.name===t)return i}return}dispose(){if(this.boneTexture!==null)this.boneTexture.dispose(),this.boneTexture=null}fromJSON(t,e){this.uuid=t.uuid;for(let n=0,i=t.bones.length;n<i;n++){let s=t.bones[n],r=e[s];if(r===void 0)dt("Skeleton: No bone found with UUID:",s),r=new Na;this.bones.push(r),this.boneInverses.push(new Vt().fromArray(t.boneInverses[n]))}return this.init(),this}toJSON(){let t={metadata:{version:4.7,type:"Skeleton",generator:"Skeleton.toJSON"},bones:[],boneInverses:[]};t.uuid=this.uuid;let e=this.bones,n=this.boneInverses;for(let i=0,s=e.length;i<s;i++){let r=e[i];t.bones.push(r.uuid);let a=n[i];t.boneInverses.push(a.toArray())}return t}}class ni extends ce{constructor(t,e,n,i=1){super(t,e,n);this.isInstancedBufferAttribute=!0,this.meshPerAttribute=i}copy(t){return super.copy(t),this.meshPerAttribute=t.meshPerAttribute,this}toJSON(){let t=super.toJSON();return t.meshPerAttribute=this.meshPerAttribute,t.isInstancedBufferAttribute=!0,t}}var es=new Vt,Kh=new Vt,Vr=[],Qh=new Fe,Qg=new Vt,Ds=new Me,Fs=new Ne;class dc extends Me{constructor(t,e,n){super(t,e);this.isInstancedMesh=!0,this.instanceMatrix=new ni(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let i=0;i<n;i++)this.setMatrixAt(i,Qg)}computeBoundingBox(){let t=this.geometry,e=this.count;if(this.boundingBox===null)this.boundingBox=new Fe;if(t.boundingBox===null)t.computeBoundingBox();this.boundingBox.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,es),Qh.copy(t.boundingBox).applyMatrix4(es),this.boundingBox.union(Qh)}computeBoundingSphere(){let t=this.geometry,e=this.count;if(this.boundingSphere===null)this.boundingSphere=new Ne;if(t.boundingSphere===null)t.computeBoundingSphere();this.boundingSphere.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,es),Fs.copy(t.boundingSphere).applyMatrix4(es),this.boundingSphere.union(Fs)}copy(t,e){if(super.copy(t,e),this.instanceMatrix.copy(t.instanceMatrix),t.morphTexture!==null)this.morphTexture=t.morphTexture.clone();if(t.instanceColor!==null)this.instanceColor=t.instanceColor.clone();if(this.count=t.count,t.boundingBox!==null)this.boundingBox=t.boundingBox.clone();if(t.boundingSphere!==null)this.boundingSphere=t.boundingSphere.clone();return this}getColorAt(t,e){if(this.instanceColor===null)return e.setRGB(1,1,1);else return e.fromArray(this.instanceColor.array,t*3)}getMatrixAt(t,e){return e.fromArray(this.instanceMatrix.array,t*16)}getMorphAt(t,e){let n=e.morphTargetInfluences,i=this.morphTexture.source.data.data,s=n.length+1,r=t*s+1;for(let a=0;a<n.length;a++)n[a]=i[r+a]}raycast(t,e){let n=this.matrixWorld,i=this.count;if(Ds.geometry=this.geometry,Ds.material=this.material,Ds.material===void 0)return;if(this.boundingSphere===null)this.computeBoundingSphere();if(Fs.copy(this.boundingSphere),Fs.applyMatrix4(n),t.ray.intersectsSphere(Fs)===!1)return;for(let s=0;s<i;s++){this.getMatrixAt(s,es),Kh.multiplyMatrices(n,es),Ds.matrixWorld=Kh,Ds.raycast(t,Vr);for(let r=0,a=Vr.length;r<a;r++){let o=Vr[r];o.instanceId=s,o.object=this,e.push(o)}Vr.length=0}}setColorAt(t,e){if(this.instanceColor===null)this.instanceColor=new ni(new Float32Array(this.instanceMatrix.count*3).fill(1),3);return e.toArray(this.instanceColor.array,t*3),this}setMatrixAt(t,e){return e.toArray(this.instanceMatrix.array,t*16),this}setMorphAt(t,e){let n=e.morphTargetInfluences,i=n.length+1;if(this.morphTexture===null)this.morphTexture=new sn(new Float32Array(i*this.count),i,this.count,1028,1015);let s=this.morphTexture.source.data.data,r=0;for(let l=0;l<n.length;l++)r+=n[l];let a=this.geometry.morphTargetsRelative?1:1-r,o=i*t;return s[o]=a,s.set(n,o+1),this}updateMorphTargets(){}dispose(){if(super.dispose(),this.morphTexture!==null)this.morphTexture.dispose(),this.morphTexture=null}}var pi=new Ne,jg=new j(0.5,0.5),Wr=new R;class ii{constructor(t=new bn,e=new bn,n=new bn,i=new bn,s=new bn,r=new bn){this.planes=[t,e,n,i,s,r]}set(t,e,n,i,s,r){let a=this.planes;return a[0].copy(t),a[1].copy(e),a[2].copy(n),a[3].copy(i),a[4].copy(s),a[5].copy(r),this}copy(t){let e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=2000,n=!1){let i=this.planes,s=t.elements,r=s[0],a=s[1],o=s[2],l=s[3],c=s[4],h=s[5],d=s[6],u=s[7],f=s[8],m=s[9],_=s[10],g=s[11],p=s[12],S=s[13],E=s[14],x=s[15];if(i[0].setComponents(l-r,u-c,g-f,x-p).normalize(),i[1].setComponents(l+r,u+c,g+f,x+p).normalize(),i[2].setComponents(l+a,u+h,g+m,x+S).normalize(),i[3].setComponents(l-a,u-h,g-m,x-S).normalize(),n)i[4].setComponents(o,d,_,E).normalize(),i[5].setComponents(l-o,u-d,g-_,x-E).normalize();else if(i[4].setComponents(l-o,u-d,g-_,x-E).normalize(),e===2000)i[5].setComponents(l+o,u+d,g+_,x+E).normalize();else if(e===2001)i[5].setComponents(o,d,_,E).normalize();else throw Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0){if(t.boundingSphere===null)t.computeBoundingSphere();pi.copy(t.boundingSphere).applyMatrix4(t.matrixWorld)}else{let e=t.geometry;if(e.boundingSphere===null)e.computeBoundingSphere();pi.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(pi)}intersectsSprite(t){pi.center.set(0,0,0);let e=jg.distanceTo(t.center);return pi.radius=0.7071067811865476+e,pi.applyMatrix4(t.matrixWorld),this.intersectsSphere(pi)}intersectsSphere(t){let e=this.planes,n=t.center,i=-t.radius;for(let s=0;s<6;s++)if(e[s].distanceToPoint(n)<i)return!1;return!0}intersectsBox(t){let e=this.planes;for(let n=0;n<6;n++){let i=e[n];if(Wr.x=i.normal.x>0?t.max.x:t.min.x,Wr.y=i.normal.y>0?t.max.y:t.min.y,Wr.z=i.normal.z>0?t.max.z:t.min.z,i.distanceToPoint(Wr)<0)return!1}return!0}containsPoint(t){let e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}var jh=new Vt;class Da{constructor(){this.coordinateSystem=2000,this._frustums=[],this._count=0}setFromArrayCamera(t){let e=t.cameras,n=this._frustums;for(let i=0;i<e.length;i++){let s=e[i];if(jh.multiplyMatrices(s.projectionMatrix,s.matrixWorldInverse),n[i]===void 0)n[i]=new ii;n[i].setFromProjectionMatrix(jh,s.coordinateSystem,s.reversedDepth)}return this._count=e.length,this}intersectsObject(t){let e=this._frustums;for(let n=0;n<this._count;n++)if(e[n].intersectsObject(t))return!0;return!1}intersectsSprite(t){let e=this._frustums;for(let n=0;n<this._count;n++)if(e[n].intersectsSprite(t))return!0;return!1}intersectsSphere(t){let e=this._frustums;for(let n=0;n<this._count;n++)if(e[n].intersectsSphere(t))return!0;return!1}intersectsBox(t){let e=this._frustums;for(let n=0;n<this._count;n++)if(e[n].intersectsBox(t))return!0;return!1}containsPoint(t){let e=this._frustums;for(let n=0;n<this._count;n++)if(e[n].containsPoint(t))return!0;return!1}copy(t){this.coordinateSystem=t.coordinateSystem;let e=this._frustums,n=t._frustums;for(let i=0;i<t._count;i++){if(e[i]===void 0)e[i]=new ii;e[i].copy(n[i])}return this._count=t._count,this}clone(){return new Da().copy(this)}}function Vo(t,e){return t-e}function t_(t,e){return t.z-e.z}function e_(t,e){return e.z-t.z}class nf{constructor(){this.index=0,this.pool=[],this.list=[]}push(t,e,n,i){let s=this.pool,r=this.list;if(this.index>=s.length)s.push({start:-1,count:-1,z:-1,index:-1});let a=s[this.index];r.push(a),this.index++,a.start=t,a.count=e,a.z=n,a.index=i}reset(){this.list.length=0,this.index=0}}var Ze=new Vt,n_=new _t(1,1,1),i_=new ii,s_=new Da,Xr=new Fe,mi=new Ne,Os=new R,tu=new R,r_=new R,Wo=new nf,Ge=new Me,qr=[];function a_(t,e,n=0){let i=e.itemSize;if(t.isInterleavedBufferAttribute||t.array.constructor!==e.array.constructor){let s=t.count;for(let r=0;r<s;r++)for(let a=0;a<i;a++)e.setComponent(r+n,a,t.getComponent(r,a))}else e.array.set(t.array,n*i);e.needsUpdate=!0}function gi(t,e){if(t.constructor!==e.constructor){let n=Math.min(t.length,e.length);for(let i=0;i<n;i++)e[i]=t[i]}else{let n=Math.min(t.length,e.length);e.set(new t.constructor(t.buffer,0,n))}}class fc extends Me{constructor(t,e,n=e*2,i){super(new Wt,i);this.isBatchedMesh=!0,this.perObjectFrustumCulled=!0,this.sortObjects=!0,this.boundingBox=null,this.boundingSphere=null,this.customSort=null,this._instanceInfo=[],this._geometryInfo=[],this._availableInstanceIds=[],this._availableGeometryIds=[],this._nextIndexStart=0,this._nextVertexStart=0,this._geometryCount=0,this._visibilityChanged=!0,this._geometryInitialized=!1,this._maxInstanceCount=t,this._maxVertexCount=e,this._maxIndexCount=n,this._multiDrawCounts=new Int32Array(t),this._multiDrawStarts=new Int32Array(t),this._multiDrawCount=0,this._multiDrawBytesPerElement=1,this._matricesTexture=null,this._indirectTexture=null,this._colorsTexture=null,this._initMatricesTexture(),this._initIndirectTexture()}get maxInstanceCount(){return this._maxInstanceCount}get instanceCount(){return this._instanceInfo.length-this._availableInstanceIds.length}get unusedVertexCount(){return this._maxVertexCount-this._nextVertexStart}get unusedIndexCount(){return this._maxIndexCount-this._nextIndexStart}_initMatricesTexture(){let t=Math.sqrt(this._maxInstanceCount*4);t=Math.ceil(t/4)*4,t=Math.max(t,4);let e=new Float32Array(t*t*4),n=new sn(e,t,t,1023,1015);this._matricesTexture=n}_initIndirectTexture(){let t=Math.sqrt(this._maxInstanceCount);t=Math.ceil(t);let e=new Uint32Array(t*t),n=new sn(e,t,t,1029,1014);this._indirectTexture=n}_initColorsTexture(){let t=Math.sqrt(this._maxInstanceCount);t=Math.ceil(t);let e=new Float32Array(t*t*4).fill(1),n=new sn(e,t,t,1023,1015);n.colorSpace=ne.workingColorSpace,this._colorsTexture=n}_initializeGeometry(t){let e=this.geometry,n=this._maxVertexCount,i=this._maxIndexCount;if(this._geometryInitialized===!1){for(let s in t.attributes){let r=t.getAttribute(s),{array:a,itemSize:o,normalized:l}=r,c=new a.constructor(n*o),h=new ce(c,o,l);e.setAttribute(s,h)}if(t.getIndex()!==null){let s=n>65535?new Uint32Array(i):new Uint16Array(i);e.setIndex(new ce(s,1))}this._geometryInitialized=!0}}_validateGeometry(t){let e=this.geometry;if(Boolean(t.getIndex())!==Boolean(e.getIndex()))throw Error('THREE.BatchedMesh: All geometries must consistently have "index".');for(let n in e.attributes){if(!t.hasAttribute(n))throw Error(`THREE.BatchedMesh: Added geometry missing "${n}". All geometries must have consistent attributes.`);let i=t.getAttribute(n),s=e.getAttribute(n);if(i.itemSize!==s.itemSize||i.normalized!==s.normalized)throw Error("THREE.BatchedMesh: All attributes must have a consistent itemSize and normalized value.")}}validateInstanceId(t){let e=this._instanceInfo;if(t<0||t>=e.length||e[t].active===!1)throw Error(`THREE.BatchedMesh: Invalid instanceId ${t}. Instance is either out of range or has been deleted.`)}validateGeometryId(t){let e=this._geometryInfo;if(t<0||t>=e.length||e[t].active===!1)throw Error(`THREE.BatchedMesh: Invalid geometryId ${t}. Geometry is either out of range or has been deleted.`)}setCustomSort(t){return this.customSort=t,this}computeBoundingBox(){if(this.boundingBox===null)this.boundingBox=new Fe;let t=this.boundingBox,e=this._instanceInfo;t.makeEmpty();for(let n=0,i=e.length;n<i;n++){if(e[n].active===!1)continue;let s=e[n].geometryIndex;this.getMatrixAt(n,Ze),this.getBoundingBoxAt(s,Xr).applyMatrix4(Ze),t.union(Xr)}}computeBoundingSphere(){if(this.boundingSphere===null)this.boundingSphere=new Ne;let t=this.boundingSphere,e=this._instanceInfo;t.makeEmpty();for(let n=0,i=e.length;n<i;n++){if(e[n].active===!1)continue;let s=e[n].geometryIndex;this.getMatrixAt(n,Ze),this.getBoundingSphereAt(s,mi).applyMatrix4(Ze),t.union(mi)}}addInstance(t){if(this._instanceInfo.length>=this.maxInstanceCount&&this._availableInstanceIds.length===0)throw Error("THREE.BatchedMesh: Maximum item count reached.");let n={visible:!0,active:!0,geometryIndex:t},i=null;if(this._availableInstanceIds.length>0)this._availableInstanceIds.sort(Vo),i=this._availableInstanceIds.shift(),this._instanceInfo[i]=n;else i=this._instanceInfo.length,this._instanceInfo.push(n);let s=this._matricesTexture;Ze.identity().toArray(s.image.data,i*16),s.needsUpdate=!0;let r=this._colorsTexture;if(r)n_.toArray(r.image.data,i*4),r.needsUpdate=!0;return this._visibilityChanged=!0,i}addGeometry(t,e=-1,n=-1){this._initializeGeometry(t),this._validateGeometry(t);let i={vertexStart:-1,vertexCount:-1,reservedVertexCount:-1,indexStart:-1,indexCount:-1,reservedIndexCount:-1,start:-1,count:-1,boundingBox:null,boundingSphere:null,active:!0},s=this._geometryInfo;i.vertexStart=this._nextVertexStart,i.reservedVertexCount=e===-1?t.getAttribute("position").count:e;let r=t.getIndex();if(r!==null)i.indexStart=this._nextIndexStart,i.reservedIndexCount=n===-1?r.count:n;if(i.indexStart!==-1&&i.indexStart+i.reservedIndexCount>this._maxIndexCount||i.vertexStart+i.reservedVertexCount>this._maxVertexCount)throw Error("THREE.BatchedMesh: Reserved space request exceeds the maximum buffer size.");let o;if(this._availableGeometryIds.length>0)this._availableGeometryIds.sort(Vo),o=this._availableGeometryIds.shift(),s[o]=i;else o=this._geometryCount,this._geometryCount++,s.push(i);return this.setGeometryAt(o,t),this._nextIndexStart=i.indexStart+i.reservedIndexCount,this._nextVertexStart=i.vertexStart+i.reservedVertexCount,o}setGeometryAt(t,e){if(t>=this._geometryCount)throw Error("THREE.BatchedMesh: Maximum geometry count reached.");this._validateGeometry(e);let n=this.geometry,i=n.getIndex()!==null,s=n.getIndex(),r=e.getIndex(),a=this._geometryInfo[t];if(i&&r.count>a.reservedIndexCount||e.attributes.position.count>a.reservedVertexCount)throw Error("THREE.BatchedMesh: Reserved space not large enough for provided geometry.");let{vertexStart:o,reservedVertexCount:l}=a;a.vertexCount=e.getAttribute("position").count;for(let c in n.attributes){let h=e.getAttribute(c),d=n.getAttribute(c);a_(h,d,o);let u=h.itemSize;for(let f=h.count,m=l;f<m;f++){let _=o+f;for(let g=0;g<u;g++)d.setComponent(_,g,0)}d.needsUpdate=!0,d.addUpdateRange(o*u,l*u)}if(i){let{indexStart:c,reservedIndexCount:h}=a;a.indexCount=e.getIndex().count;for(let d=0;d<r.count;d++)s.setX(c+d,o+r.getX(d));for(let d=r.count,u=h;d<u;d++)s.setX(c+d,o);s.needsUpdate=!0,s.addUpdateRange(c,a.reservedIndexCount)}if(a.start=i?a.indexStart:a.vertexStart,a.count=i?a.indexCount:a.vertexCount,a.boundingBox=null,e.boundingBox!==null)a.boundingBox=e.boundingBox.clone();if(a.boundingSphere=null,e.boundingSphere!==null)a.boundingSphere=e.boundingSphere.clone();return this._visibilityChanged=!0,t}deleteGeometry(t){let e=this._geometryInfo;if(t>=e.length||e[t].active===!1)return this;let n=this._instanceInfo;for(let i=0,s=n.length;i<s;i++)if(n[i].active&&n[i].geometryIndex===t)this.deleteInstance(i);return e[t].active=!1,this._availableGeometryIds.push(t),this._visibilityChanged=!0,this}deleteInstance(t){return this.validateInstanceId(t),this._instanceInfo[t].active=!1,this._availableInstanceIds.push(t),this._visibilityChanged=!0,this}optimize(){let t=0,e=0,n=this._geometryInfo,i=n.map((r,a)=>a).sort((r,a)=>n[r].vertexStart-n[a].vertexStart),s=this.geometry;for(let r=0,a=n.length;r<a;r++){let o=i[r],l=n[o];if(l.active===!1)continue;if(s.index!==null){if(l.indexStart!==e){let{indexStart:c,vertexStart:h,reservedIndexCount:d}=l,u=s.index,f=u.array,m=t-h;for(let _=c;_<c+d;_++)f[_]=f[_]+m;u.array.copyWithin(e,c,c+d),u.addUpdateRange(e,d),u.needsUpdate=!0,l.indexStart=e}e+=l.reservedIndexCount}if(l.vertexStart!==t){let{vertexStart:c,reservedVertexCount:h}=l,d=s.attributes;for(let u in d){let f=d[u],{array:m,itemSize:_}=f;m.copyWithin(t*_,c*_,(c+h)*_),f.addUpdateRange(t*_,h*_),f.needsUpdate=!0}l.vertexStart=t}t+=l.reservedVertexCount,l.start=s.index?l.indexStart:l.vertexStart}return this._nextIndexStart=e,this._nextVertexStart=t,this._visibilityChanged=!0,this}getBoundingBoxAt(t,e){if(t>=this._geometryCount)return null;let n=this.geometry,i=this._geometryInfo[t];if(i.boundingBox===null){let s=new Fe,r=n.index,a=n.attributes.position;for(let o=i.start,l=i.start+i.count;o<l;o++){let c=o;if(r)c=r.getX(c);s.expandByPoint(Os.fromBufferAttribute(a,c))}i.boundingBox=s}return e.copy(i.boundingBox),e}getBoundingSphereAt(t,e){if(t>=this._geometryCount)return null;let n=this.geometry,i=this._geometryInfo[t];if(i.boundingSphere===null){let s=new Ne;this.getBoundingBoxAt(t,Xr),Xr.getCenter(s.center);let r=n.index,a=n.attributes.position,o=0;for(let l=i.start,c=i.start+i.count;l<c;l++){let h=l;if(r)h=r.getX(h);Os.fromBufferAttribute(a,h),o=Math.max(o,s.center.distanceToSquared(Os))}s.radius=Math.sqrt(o),i.boundingSphere=s}return e.copy(i.boundingSphere),e}setMatrixAt(t,e){this.validateInstanceId(t);let n=this._matricesTexture,i=this._matricesTexture.image.data;return e.toArray(i,t*16),n.needsUpdate=!0,this}getMatrixAt(t,e){return this.validateInstanceId(t),e.fromArray(this._matricesTexture.image.data,t*16)}setColorAt(t,e){if(this.validateInstanceId(t),this._colorsTexture===null)this._initColorsTexture();return e.toArray(this._colorsTexture.image.data,t*4),this._colorsTexture.needsUpdate=!0,this}getColorAt(t,e){if(this.validateInstanceId(t),this._colorsTexture===null)if(e.isVector4)return e.set(1,1,1,1);else return e.setRGB(1,1,1);else return e.fromArray(this._colorsTexture.image.data,t*4)}setVisibleAt(t,e){if(this.validateInstanceId(t),this._instanceInfo[t].visible===e)return this;return this._instanceInfo[t].visible=e,this._visibilityChanged=!0,this}getVisibleAt(t){return this.validateInstanceId(t),this._instanceInfo[t].visible}setGeometryIdAt(t,e){return this.validateInstanceId(t),this.validateGeometryId(e),this._instanceInfo[t].geometryIndex=e,this._visibilityChanged=!0,this}getGeometryIdAt(t){return this.validateInstanceId(t),this._instanceInfo[t].geometryIndex}getGeometryRangeAt(t,e={}){this.validateGeometryId(t);let n=this._geometryInfo[t];return e.vertexStart=n.vertexStart,e.vertexCount=n.vertexCount,e.reservedVertexCount=n.reservedVertexCount,e.indexStart=n.indexStart,e.indexCount=n.indexCount,e.reservedIndexCount=n.reservedIndexCount,e.start=n.start,e.count=n.count,e}setInstanceCount(t){let e=this._availableInstanceIds,n=this._instanceInfo;e.sort(Vo);while(e[e.length-1]===n.length-1)n.pop(),e.pop();if(t<n.length)throw Error(`THREE.BatchedMesh: Instance ids outside the range ${t} are being used. Cannot shrink instance count.`);let i=new Int32Array(t),s=new Int32Array(t);gi(this._multiDrawCounts,i),gi(this._multiDrawStarts,s),this._multiDrawCounts=i,this._multiDrawStarts=s,this._maxInstanceCount=t;let r=this._indirectTexture,a=this._matricesTexture,o=this._colorsTexture;if(r.dispose(),this._initIndirectTexture(),gi(r.image.data,this._indirectTexture.image.data),a.dispose(),this._initMatricesTexture(),gi(a.image.data,this._matricesTexture.image.data),o)o.dispose(),this._initColorsTexture(),gi(o.image.data,this._colorsTexture.image.data)}setGeometrySize(t,e){let n=[...this._geometryInfo].filter((a)=>a.active);if(Math.max(...n.map((a)=>a.vertexStart+a.reservedVertexCount))>t)throw Error(`THREE.BatchedMesh: Geometry vertex values are being used outside the range ${e}. Cannot shrink further.`);if(this.geometry.index){if(Math.max(...n.map((o)=>o.indexStart+o.reservedIndexCount))>e)throw Error(`THREE.BatchedMesh: Geometry index values are being used outside the range ${e}. Cannot shrink further.`)}let s=this.geometry;if(s.dispose(),this._maxVertexCount=t,this._maxIndexCount=e,this._geometryInitialized)this._geometryInitialized=!1,this.geometry=new Wt,this._initializeGeometry(s);let r=this.geometry;if(s.index)gi(s.index.array,r.index.array);for(let a in s.attributes)gi(s.attributes[a].array,r.attributes[a].array)}raycast(t,e){let n=this._instanceInfo,i=this._geometryInfo,s=this.matrixWorld,r=this.geometry;if(Ge.material=this.material,Ge.geometry.index=r.index,Ge.geometry.attributes=r.attributes,Ge.geometry.boundingBox===null)Ge.geometry.boundingBox=new Fe;if(Ge.geometry.boundingSphere===null)Ge.geometry.boundingSphere=new Ne;for(let a=0,o=n.length;a<o;a++){if(!n[a].visible||!n[a].active)continue;let l=n[a].geometryIndex,c=i[l];Ge.geometry.setDrawRange(c.start,c.count),this.getMatrixAt(a,Ge.matrixWorld).premultiply(s),this.getBoundingBoxAt(l,Ge.geometry.boundingBox),this.getBoundingSphereAt(l,Ge.geometry.boundingSphere),Ge.raycast(t,qr);for(let h=0,d=qr.length;h<d;h++){let u=qr[h];u.object=this,u.batchId=a,e.push(u)}qr.length=0}Ge.material=null,Ge.geometry.index=null,Ge.geometry.attributes={},Ge.geometry.setDrawRange(0,1/0)}copy(t){if(super.copy(t),this.geometry=t.geometry.clone(),this.perObjectFrustumCulled=t.perObjectFrustumCulled,this.sortObjects=t.sortObjects,this.boundingBox=t.boundingBox!==null?t.boundingBox.clone():null,this.boundingSphere=t.boundingSphere!==null?t.boundingSphere.clone():null,this._geometryInfo=t._geometryInfo.map((e)=>({...e,boundingBox:e.boundingBox!==null?e.boundingBox.clone():null,boundingSphere:e.boundingSphere!==null?e.boundingSphere.clone():null})),this._instanceInfo=t._instanceInfo.map((e)=>({...e})),this._availableInstanceIds=t._availableInstanceIds.slice(),this._availableGeometryIds=t._availableGeometryIds.slice(),this._nextIndexStart=t._nextIndexStart,this._nextVertexStart=t._nextVertexStart,this._geometryCount=t._geometryCount,this._maxInstanceCount=t._maxInstanceCount,this._maxVertexCount=t._maxVertexCount,this._maxIndexCount=t._maxIndexCount,this._geometryInitialized=t._geometryInitialized,this._multiDrawCounts=t._multiDrawCounts.slice(),this._multiDrawStarts=t._multiDrawStarts.slice(),this._multiDrawBytesPerElement=t._multiDrawBytesPerElement,this._indirectTexture=t._indirectTexture.clone(),this._indirectTexture.image.data=this._indirectTexture.image.data.slice(),this._matricesTexture=t._matricesTexture.clone(),this._matricesTexture.image.data=this._matricesTexture.image.data.slice(),this._colorsTexture!==null)this._colorsTexture=t._colorsTexture.clone(),this._colorsTexture.image.data=this._colorsTexture.image.data.slice();return this}dispose(){if(super.dispose(),this.geometry.dispose(),this._matricesTexture.dispose(),this._matricesTexture=null,this._indirectTexture.dispose(),this._indirectTexture=null,this._colorsTexture!==null)this._colorsTexture.dispose(),this._colorsTexture=null}onBeforeRender(t,e,n,i,s){if(!this._visibilityChanged&&!this.perObjectFrustumCulled&&!this.sortObjects)return;let r=i.getIndex(),a=r===null?1:r.array.BYTES_PER_ELEMENT,o=1;if(s.wireframe)o=2,a=i.attributes.position.count>65535?4:2;let l=this._instanceInfo,c=this._multiDrawStarts,h=this._multiDrawCounts,d=this._geometryInfo,u=this.perObjectFrustumCulled,f=this._indirectTexture,m=f.image.data,_=n.isArrayCamera?s_:i_;if(u)if(n.isArrayCamera)_.setFromArrayCamera(n);else Ze.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse).multiply(this.matrixWorld),_.setFromProjectionMatrix(Ze,n.coordinateSystem,n.reversedDepth);let g=0;if(this.sortObjects){Ze.copy(this.matrixWorld).invert(),Os.setFromMatrixPosition(n.matrixWorld).applyMatrix4(Ze),tu.set(0,0,-1).transformDirection(n.matrixWorld).transformDirection(Ze);for(let E=0,x=l.length;E<x;E++)if(l[E].visible&&l[E].active){let T=l[E].geometryIndex;this.getMatrixAt(E,Ze),this.getBoundingSphereAt(T,mi).applyMatrix4(Ze);let C=!1;if(u)C=!_.intersectsSphere(mi);if(!C){let w=d[T],v=r_.subVectors(mi.center,Os).dot(tu);Wo.push(w.start,w.count,v,E)}}let p=Wo.list,S=this.customSort;if(S===null)p.sort(s.transparent?e_:t_);else S.call(this,p,n);for(let E=0,x=p.length;E<x;E++){let T=p[E];c[g]=T.start*a*o,h[g]=T.count*o,m[g]=T.index,g++}Wo.reset()}else for(let p=0,S=l.length;p<S;p++)if(l[p].visible&&l[p].active){let E=l[p].geometryIndex,x=!1;if(u)this.getMatrixAt(p,Ze),this.getBoundingSphereAt(E,mi).applyMatrix4(Ze),x=!_.intersectsSphere(mi);if(!x){let T=d[E];c[g]=T.start*a*o,h[g]=T.count*o,m[g]=p,g++}}f.needsUpdate=!0,this._multiDrawCount=g,this._multiDrawBytesPerElement=a,this._visibilityChanged=!1}onBeforeShadow(t,e,n,i,s,r){this.onBeforeRender(t,null,i,s,r)}}class He extends Ue{constructor(t){super();this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new _t(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.linewidth=t.linewidth,this.linecap=t.linecap,this.linejoin=t.linejoin,this.fog=t.fog,this}}var ua=new R,da=new R,eu=new Vt,Bs=new Ni,Yr=new Ne,Xo=new R,nu=new R;class Hn extends re{constructor(t=new Wt,e=new He){super();this.isLine=!0,this.type="Line",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}computeLineDistances(){let t=this.geometry;if(t.index===null){let e=t.attributes.position,n=[0];for(let i=1,s=e.count;i<s;i++)ua.fromBufferAttribute(e,i-1),da.fromBufferAttribute(e,i),n[i]=n[i-1],n[i]+=ua.distanceTo(da);t.setAttribute("lineDistance",new Tt(n,1))}else dt("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let n=this.geometry,i=this.matrixWorld,s=t.params.Line.threshold,r=n.drawRange;if(n.boundingSphere===null)n.computeBoundingSphere();if(Yr.copy(n.boundingSphere),Yr.applyMatrix4(i),Yr.radius+=s,t.ray.intersectsSphere(Yr)===!1)return;eu.copy(i).invert(),Bs.copy(t.ray).applyMatrix4(eu);let a=s/((this.scale.x+this.scale.y+this.scale.z)/3),o=a*a,l=this.isLineSegments?2:1,c=n.index,d=n.attributes.position;if(c!==null){let u=Math.max(0,r.start),f=Math.min(c.count,r.start+r.count);for(let m=u,_=f-1;m<_;m+=l){let g=c.getX(m),p=c.getX(m+1),S=Zr(this,t,Bs,o,g,p,m);if(S)e.push(S)}if(this.isLineLoop){let m=c.getX(f-1),_=c.getX(u),g=Zr(this,t,Bs,o,m,_,f-1);if(g)e.push(g)}}else{let u=Math.max(0,r.start),f=Math.min(d.count,r.start+r.count);for(let m=u,_=f-1;m<_;m+=l){let g=Zr(this,t,Bs,o,m,m+1,m);if(g)e.push(g)}if(this.isLineLoop){let m=Zr(this,t,Bs,o,f-1,u,f-1);if(m)e.push(m)}}}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let i=e[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,r=i.length;s<r;s++){let a=i[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}}function Zr(t,e,n,i,s,r,a){let o=t.geometry.attributes.position;if(ua.fromBufferAttribute(o,s),da.fromBufferAttribute(o,r),n.distanceSqToSegment(ua,da,Xo,nu)>i)return;Xo.applyMatrix4(t.matrixWorld);let c=e.ray.origin.distanceTo(Xo);if(c<e.near||c>e.far)return;return{distance:c,point:nu.clone().applyMatrix4(t.matrixWorld),index:a,face:null,faceIndex:null,barycoord:null,object:t}}var iu=new R,su=new R;class vn extends Hn{constructor(t,e){super(t,e);this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){let t=this.geometry;if(t.index===null){let e=t.attributes.position,n=[];for(let i=0,s=e.count;i<s;i+=2)iu.fromBufferAttribute(e,i),su.fromBufferAttribute(e,i+1),n[i]=i===0?0:n[i-1],n[i+1]=n[i]+iu.distanceTo(su);t.setAttribute("lineDistance",new Tt(n,1))}else dt("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class pc extends Hn{constructor(t,e){super(t,e);this.isLineLoop=!0,this.type="LineLoop"}}class Fa extends Ue{constructor(t){super();this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new _t(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.size=t.size,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}}var ru=new Vt,il=new Ni,Jr=new Ne,$r=new R;class mc extends re{constructor(t=new Wt,e=new Fa){super();this.isPoints=!0,this.type="Points",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let n=this.geometry,i=this.matrixWorld,s=t.params.Points.threshold,r=n.drawRange;if(n.boundingSphere===null)n.computeBoundingSphere();if(Jr.copy(n.boundingSphere),Jr.applyMatrix4(i),Jr.radius+=s,t.ray.intersectsSphere(Jr)===!1)return;ru.copy(i).invert(),il.copy(t.ray).applyMatrix4(ru);let a=s/((this.scale.x+this.scale.y+this.scale.z)/3),o=a*a,l=n.index,h=n.attributes.position;if(l!==null){let d=Math.max(0,r.start),u=Math.min(l.count,r.start+r.count);for(let f=d,m=u;f<m;f++){let _=l.getX(f);$r.fromBufferAttribute(h,_),au($r,_,o,i,t,e,this)}}else{let d=Math.max(0,r.start),u=Math.min(h.count,r.start+r.count);for(let f=d,m=u;f<m;f++)$r.fromBufferAttribute(h,f),au($r,f,o,i,t,e,this)}}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let i=e[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,r=i.length;s<r;s++){let a=i[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}}function au(t,e,n,i,s,r,a){let o=il.distanceSqToPoint(t);if(o<n){let l=new R;il.closestPointToPoint(t,l),l.applyMatrix4(i);let c=s.ray.origin.distanceTo(l);if(c<s.near||c>s.far)return;r.push({distance:c,distanceToRay:Math.sqrt(o),point:l,index:e,face:null,faceIndex:null,barycoord:null,object:a})}}class gc extends Se{constructor(t,e,n,i,s=1006,r=1006,a,o,l){super(t,e,n,i,s,r,a,o,l);this.isVideoTexture=!0,this.generateMipmaps=!1,this._requestVideoFrameCallbackId=0;let c=this;function h(){c.needsUpdate=!0,c._requestVideoFrameCallbackId=t.requestVideoFrameCallback(h)}if("requestVideoFrameCallback"in t)this._requestVideoFrameCallbackId=t.requestVideoFrameCallback(h)}clone(){return new this.constructor(this.image).copy(this)}update(){let t=this.image;if("requestVideoFrameCallback"in t===!1&&t.readyState>=t.HAVE_CURRENT_DATA)this.needsUpdate=!0}dispose(){if(this._requestVideoFrameCallbackId!==0)this.source.data.cancelVideoFrameCallback(this._requestVideoFrameCallbackId),this._requestVideoFrameCallbackId=0;super.dispose()}}class sf extends gc{constructor(t,e,n,i,s,r,a,o){super({},t,e,n,i,s,r,a,o);this.isVideoFrameTexture=!0}update(){}clone(){return new this.constructor().copy(this)}setFrame(t){this.image=t,this.needsUpdate=!0}}class rf extends Se{constructor(t,e){super({width:t,height:e});this.isFramebufferTexture=!0,this.magFilter=1003,this.minFilter=1003,this.generateMipmaps=!1,this.needsUpdate=!0}}class rr extends Se{constructor(t,e,n,i,s,r,a,o,l,c,h,d){super(null,r,a,o,l,c,i,s,h,d);this.isCompressedTexture=!0,this.image={width:e,height:n},this.mipmaps=t,this.flipY=!1,this.generateMipmaps=!1}}class af extends rr{constructor(t,e,n,i,s,r){super(t,e,n,s,r);this.isCompressedArrayTexture=!0,this.image.depth=i,this.wrapR=1001,this.layerUpdates=new Set}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}}class of extends rr{constructor(t,e,n){super(void 0,t[0].width,t[0].height,e,n,301);this.isCompressedCubeTexture=!0,this.isCubeTexture=!0,this.image=t}}class ys extends Se{constructor(t=[],e=301,n,i,s,r,a,o,l,c){super(t,e,n,i,s,r,a,o,l,c);this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}}class lf extends Se{constructor(t,e,n,i,s,r,a,o,l){super(t,e,n,i,s,r,a,o,l);this.isCanvasTexture=!0,this.needsUpdate=!0}}class cf extends Se{constructor(t,e,n,i,s,r,a,o,l){super(t,e,n,i,s,r,a,o,l);this.isHTMLTexture=!0,this.generateMipmaps=!1,this.needsUpdate=!0;let c=t?t.parentNode:null;if(c!==null&&"requestPaint"in c)c.onpaint=()=>{this.needsUpdate=!0},c.requestPaint()}dispose(){let t=this.image?this.image.parentNode:null;if(t!==null&&"onpaint"in t)t.onpaint=null;super.dispose()}}class Ui extends Se{constructor(t,e,n=1014,i,s,r,a=1003,o=1003,l,c=1026,h=1){if(c!==1026&&c!==1027)throw Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let d={width:t,height:e,depth:h};super(d,i,s,r,a,o,c,n,l);this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new Tn(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){let e=super.toJSON(t);return e.compareFunction=this.compareFunction,e}}class _c extends Ui{constructor(t,e=1014,n=301,i,s,r=1003,a=1003,o,l=1026){let c={width:t,height:t,depth:1},h=[c,c,c,c,c,c];super(t,t,e,n,i,s,r,a,o,l);this.image=h,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(t){this.image=t}}class Oa extends Se{constructor(t=null){super();this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}}class Di extends Wt{constructor(t=1,e=1,n=1,i=1,s=1,r=1){super();this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:i,heightSegments:s,depthSegments:r};let a=this;i=Math.floor(i),s=Math.floor(s),r=Math.floor(r);let o=[],l=[],c=[],h=[],d=0,u=0;f("z","y","x",-1,-1,n,e,t,r,s,0),f("z","y","x",1,-1,n,e,-t,r,s,1),f("x","z","y",1,1,t,n,e,i,r,2),f("x","z","y",1,-1,t,n,-e,i,r,3),f("x","y","z",1,-1,t,e,n,i,s,4),f("x","y","z",-1,-1,t,e,-n,i,s,5),this.setIndex(o),this.setAttribute("position",new Tt(l,3)),this.setAttribute("normal",new Tt(c,3)),this.setAttribute("uv",new Tt(h,2));function f(m,_,g,p,S,E,x,T,C,w,v){let b=E/C,O=x/w,L=E/2,F=x/2,Z=T/2,P=C+1,G=w+1,J=0,k=0,at=new R;for(let W=0;W<G;W++){let Q=W*O-F;for(let it=0;it<P;it++){let Dt=it*b-L;at[m]=Dt*p,at[_]=Q*S,at[g]=Z,l.push(at.x,at.y,at.z),at[m]=0,at[_]=0,at[g]=T>0?1:-1,c.push(at.x,at.y,at.z),h.push(it/C),h.push(1-W/w),J+=1}}for(let W=0;W<w;W++)for(let Q=0;Q<C;Q++){let it=d+Q+P*W,Dt=d+Q+P*(W+1),Ft=d+(Q+1)+P*(W+1),he=d+(Q+1)+P*W;o.push(it,Dt,he),o.push(Dt,Ft,he),k+=6}a.addGroup(u,k,v),u+=k,d+=J}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Di(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}}class Ba extends Wt{constructor(t=1,e=1,n=4,i=8,s=1){super();this.type="CapsuleGeometry",this.parameters={radius:t,height:e,capSegments:n,radialSegments:i,heightSegments:s},e=Math.max(0,e),n=Math.max(1,Math.floor(n)),i=Math.max(3,Math.floor(i)),s=Math.max(1,Math.floor(s));let r=[],a=[],o=[],l=[],c=e/2,h=Math.PI/2*t,d=e,u=2*h+d,f=n*2+s,m=i+1,_=new R,g=new R;for(let p=0;p<=f;p++){let S=0,E=0,x=0,T=0;if(p<=n){let v=p/n,b=v*Math.PI/2;E=-c-t*Math.cos(b),x=t*Math.sin(b),T=-t*Math.cos(b),S=v*h}else if(p<=n+s){let v=(p-n)/s;E=-c+v*e,x=t,T=0,S=h+v*d}else{let v=(p-n-s)/n,b=v*Math.PI/2;E=c+t*Math.sin(b),x=t*Math.cos(b),T=t*Math.sin(b),S=h+d+v*h}let C=Math.max(0,Math.min(1,S/u)),w=0;if(p===0)w=0.5/i;else if(p===f)w=-0.5/i;for(let v=0;v<=i;v++){let b=v/i,O=b*Math.PI*2,L=Math.sin(O),F=Math.cos(O);g.x=-x*F,g.y=E,g.z=x*L,a.push(g.x,g.y,g.z),_.set(-x*F,T,x*L),_.normalize(),o.push(_.x,_.y,_.z),l.push(b+w,C)}if(p>0){let v=(p-1)*m;for(let b=0;b<i;b++){let O=v+b,L=v+b+1,F=p*m+b,Z=p*m+b+1;r.push(O,L,F),r.push(L,Z,F)}}}this.setIndex(r),this.setAttribute("position",new Tt(a,3)),this.setAttribute("normal",new Tt(o,3)),this.setAttribute("uv",new Tt(l,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Ba(t.radius,t.height,t.capSegments,t.radialSegments,t.heightSegments)}}class za extends Wt{constructor(t=1,e=32,n=0,i=Math.PI*2){super();this.type="CircleGeometry",this.parameters={radius:t,segments:e,thetaStart:n,thetaLength:i},e=Math.max(3,e);let s=[],r=[],a=[],o=[],l=new R,c=new j;r.push(0,0,0),a.push(0,0,1),o.push(0.5,0.5);for(let h=0,d=3;h<=e;h++,d+=3){let u=n+h/e*i;l.x=t*Math.cos(u),l.y=t*Math.sin(u),r.push(l.x,l.y,l.z),a.push(0,0,1),c.x=(r[d]/t+1)/2,c.y=(r[d+1]/t+1)/2,o.push(c.x,c.y)}for(let h=1;h<=e;h++)s.push(h,h+1,0);this.setIndex(s),this.setAttribute("position",new Tt(r,3)),this.setAttribute("normal",new Tt(a,3)),this.setAttribute("uv",new Tt(o,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new za(t.radius,t.segments,t.thetaStart,t.thetaLength)}}class ar extends Wt{constructor(t=1,e=1,n=1,i=32,s=1,r=!1,a=0,o=Math.PI*2){super();this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:n,radialSegments:i,heightSegments:s,openEnded:r,thetaStart:a,thetaLength:o};let l=this;i=Math.floor(i),s=Math.floor(s);let c=[],h=[],d=[],u=[],f=0,m=[],_=n/2,g=0;if(p(),r===!1){if(t>0)S(!0);if(e>0)S(!1)}this.setIndex(c),this.setAttribute("position",new Tt(h,3)),this.setAttribute("normal",new Tt(d,3)),this.setAttribute("uv",new Tt(u,2));function p(){let E=new R,x=new R,T=0,C=(e-t)/n;for(let w=0;w<=s;w++){let v=[],b=w/s,O=b*(e-t)+t;for(let L=0;L<=i;L++){let F=L/i,Z=F*o+a,P=Math.sin(Z),G=Math.cos(Z);x.x=O*P,x.y=-b*n+_,x.z=O*G,h.push(x.x,x.y,x.z),E.set(P,C,G).normalize(),d.push(E.x,E.y,E.z),u.push(F,1-b),v.push(f++)}m.push(v)}for(let w=0;w<i;w++)for(let v=0;v<s;v++){let b=m[v][w],O=m[v+1][w],L=m[v+1][w+1],F=m[v][w+1];if(t>0||v!==0)c.push(b,O,F),T+=3;if(e>0||v!==s-1)c.push(O,L,F),T+=3}l.addGroup(g,T,0),g+=T}function S(E){let x=f,T=new j,C=new R,w=0,v=E===!0?t:e,b=E===!0?1:-1;for(let L=1;L<=i;L++)h.push(0,_*b,0),d.push(0,b,0),u.push(0.5,0.5),f++;let O=f;for(let L=0;L<=i;L++){let Z=L/i*o+a,P=Math.cos(Z),G=Math.sin(Z);C.x=v*G,C.y=_*b,C.z=v*P,h.push(C.x,C.y,C.z),d.push(0,b,0),T.x=P*0.5+0.5,T.y=G*0.5*b+0.5,u.push(T.x,T.y),f++}for(let L=0;L<i;L++){let F=x+L,Z=O+L;if(E===!0)c.push(Z,Z+1,F);else c.push(Z+1,Z,F);w+=3}l.addGroup(g,w,E===!0?1:2),g+=w}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new ar(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}}class or extends ar{constructor(t=1,e=1,n=32,i=1,s=!1,r=0,a=Math.PI*2){super(0,t,e,n,i,s,r,a);this.type="ConeGeometry",this.parameters={radius:t,height:e,radialSegments:n,heightSegments:i,openEnded:s,thetaStart:r,thetaLength:a}}static fromJSON(t){return new or(t.radius,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}}class ai extends Wt{constructor(t=[],e=[],n=1,i=0){super();this.type="PolyhedronGeometry",this.parameters={vertices:t,indices:e,radius:n,detail:i};let s=[],r=[];if(a(i),l(n),c(),this.setAttribute("position",new Tt(s,3)),this.setAttribute("normal",new Tt(s.slice(),3)),this.setAttribute("uv",new Tt(r,2)),i===0)this.computeVertexNormals();else this.normalizeNormals();function a(p){let S=new R,E=new R,x=new R;for(let T=0;T<e.length;T+=3)u(e[T+0],S),u(e[T+1],E),u(e[T+2],x),o(S,E,x,p)}function o(p,S,E,x){let T=x+1,C=[];for(let w=0;w<=T;w++){C[w]=[];let v=p.clone().lerp(E,w/T),b=S.clone().lerp(E,w/T),O=T-w;for(let L=0;L<=O;L++)if(L===0&&w===T)C[w][L]=v;else C[w][L]=v.clone().lerp(b,L/O)}for(let w=0;w<T;w++)for(let v=0;v<2*(T-w)-1;v++){let b=Math.floor(v/2);if(v%2===0)d(C[w][b+1]),d(C[w+1][b]),d(C[w][b]);else d(C[w][b+1]),d(C[w+1][b+1]),d(C[w+1][b])}}function l(p){let S=new R;for(let E=0;E<s.length;E+=3)S.x=s[E+0],S.y=s[E+1],S.z=s[E+2],S.normalize().multiplyScalar(p),s[E+0]=S.x,s[E+1]=S.y,s[E+2]=S.z}function c(){let p=new R;for(let S=0;S<s.length;S+=3){p.x=s[S+0],p.y=s[S+1],p.z=s[S+2];let E=_(p)/2/Math.PI+0.5,x=g(p)/Math.PI+0.5;r.push(E,1-x)}f(),h()}function h(){for(let p=0;p<r.length;p+=6){let S=r[p+0],E=r[p+2],x=r[p+4],T=Math.max(S,E,x),C=Math.min(S,E,x);if(T>0.9&&C<0.1){if(S<0.2)r[p+0]+=1;if(E<0.2)r[p+2]+=1;if(x<0.2)r[p+4]+=1}}}function d(p){s.push(p.x,p.y,p.z)}function u(p,S){let E=p*3;S.x=t[E+0],S.y=t[E+1],S.z=t[E+2]}function f(){let p=new R,S=new R,E=new R,x=new R,T=new j,C=new j,w=new j;for(let v=0,b=0;v<s.length;v+=9,b+=6){p.set(s[v+0],s[v+1],s[v+2]),S.set(s[v+3],s[v+4],s[v+5]),E.set(s[v+6],s[v+7],s[v+8]),T.set(r[b+0],r[b+1]),C.set(r[b+2],r[b+3]),w.set(r[b+4],r[b+5]),x.copy(p).add(S).add(E).divideScalar(3);let O=_(x);m(T,b+0,p,O),m(C,b+2,S,O),m(w,b+4,E,O)}}function m(p,S,E,x){if(x<0&&p.x===1)r[S]=p.x-1;if(E.x===0&&E.z===0)r[S]=x/2/Math.PI+0.5}function _(p){return Math.atan2(p.z,-p.x)}function g(p){return Math.atan2(-p.y,Math.sqrt(p.x*p.x+p.z*p.z))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new ai(t.vertices,t.indices,t.radius,t.detail)}}class Ga extends ai{constructor(t=1,e=0){let n=(1+Math.sqrt(5))/2,i=1/n,s=[-1,-1,-1,-1,-1,1,-1,1,-1,-1,1,1,1,-1,-1,1,-1,1,1,1,-1,1,1,1,0,-i,-n,0,-i,n,0,i,-n,0,i,n,-i,-n,0,-i,n,0,i,-n,0,i,n,0,-n,0,-i,n,0,-i,-n,0,i,n,0,i],r=[3,11,7,3,7,15,3,15,13,7,19,17,7,17,6,7,6,15,17,4,8,17,8,10,17,10,6,8,0,16,8,16,2,8,2,10,0,12,1,0,1,18,0,18,16,6,10,2,6,2,13,6,13,15,2,16,18,2,18,3,2,3,13,18,1,9,18,9,11,18,11,3,4,14,12,4,12,0,4,0,8,11,9,5,11,5,19,11,19,7,19,5,14,19,14,4,19,4,17,1,12,14,1,14,5,1,5,9];super(s,r,t,e);this.type="DodecahedronGeometry",this.parameters={radius:t,detail:e}}static fromJSON(t){return new Ga(t.radius,t.detail)}}var Kr=new R,Qr=new R,qo=new R,jr=new $e;class xc extends Wt{constructor(t=null,e=1){super();if(this.type="EdgesGeometry",this.parameters={geometry:t,thresholdAngle:e},t!==null){let i=Math.pow(10,4),s=Math.cos(Ti*e),r=t.getIndex(),a=t.getAttribute("position"),o=r?r.count:a.count,l=[0,0,0],c=["a","b","c"],h=[,,,],d={},u=[];for(let f=0;f<o;f+=3){if(r)l[0]=r.getX(f),l[1]=r.getX(f+1),l[2]=r.getX(f+2);else l[0]=f,l[1]=f+1,l[2]=f+2;let{a:m,b:_,c:g}=jr;if(m.fromBufferAttribute(a,l[0]),_.fromBufferAttribute(a,l[1]),g.fromBufferAttribute(a,l[2]),jr.getNormal(qo),h[0]=`${Math.round(m.x*i)},${Math.round(m.y*i)},${Math.round(m.z*i)}`,h[1]=`${Math.round(_.x*i)},${Math.round(_.y*i)},${Math.round(_.z*i)}`,h[2]=`${Math.round(g.x*i)},${Math.round(g.y*i)},${Math.round(g.z*i)}`,h[0]===h[1]||h[1]===h[2]||h[2]===h[0])continue;for(let p=0;p<3;p++){let S=(p+1)%3,E=h[p],x=h[S],T=jr[c[p]],C=jr[c[S]],w=`${E}_${x}`,v=`${x}_${E}`;if(v in d&&d[v]){if(qo.dot(d[v].normal)<=s)u.push(T.x,T.y,T.z),u.push(C.x,C.y,C.z);d[v]=null}else if(!(w in d))d[w]={index0:l[p],index1:l[S],normal:qo.clone()}}}for(let f in d)if(d[f]){let{index0:m,index1:_}=d[f];Kr.fromBufferAttribute(a,m),Qr.fromBufferAttribute(a,_),u.push(Kr.x,Kr.y,Kr.z),u.push(Qr.x,Qr.y,Qr.z)}this.setAttribute("position",new Tt(u,3))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}}class cn{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){dt("Curve: .getPoint() not implemented.")}getPointAt(t,e){let n=this.getUtoTmapping(t);return this.getPoint(n,e)}getPoints(t=5){let e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return e}getSpacedPoints(t=5){let e=[];for(let n=0;n<=t;n++)e.push(this.getPointAt(n/t));return e}getLength(){let t=this.getLengths();return t[t.length-1]}getLengths(t=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===t+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let e=[],n,i=this.getPoint(0),s=0;e.push(0);for(let r=1;r<=t;r++)n=this.getPoint(r/t),s+=n.distanceTo(i),e.push(s),i=n;return this.cacheArcLengths=e,e}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(t,e=null){let n=this.getLengths(),i=0,s=n.length,r;if(e)r=e;else r=t*n[s-1];let a=0,o=s-1,l;while(a<=o)if(i=Math.floor(a+(o-a)/2),l=n[i]-r,l<0)a=i+1;else if(l>0)o=i-1;else{o=i;break}if(i=o,n[i]===r)return i/(s-1);let c=n[i],d=n[i+1]-c,u=(r-c)/d;return(i+u)/(s-1)}getTangent(t,e){let i=t-0.0001,s=t+0.0001;if(i<0)i=0;if(s>1)s=1;let r=this.getPoint(i),a=this.getPoint(s),o=e||(r.isVector2?new j:new R);return o.copy(a).sub(r).normalize(),o}getTangentAt(t,e){let n=this.getUtoTmapping(t);return this.getTangent(n,e)}computeFrenetFrames(t,e=!1){let n=new R,i=[],s=[],r=[],a=new R,o=new Vt;for(let u=0;u<=t;u++){let f=u/t;i[u]=this.getTangentAt(f,new R)}s[0]=new R,r[0]=new R;let l=Number.MAX_VALUE,c=Math.abs(i[0].x),h=Math.abs(i[0].y),d=Math.abs(i[0].z);if(c<=l)l=c,n.set(1,0,0);if(h<=l)l=h,n.set(0,1,0);if(d<=l)n.set(0,0,1);a.crossVectors(i[0],n).normalize(),s[0].crossVectors(i[0],a),r[0].crossVectors(i[0],s[0]);for(let u=1;u<=t;u++){if(s[u]=s[u-1].clone(),r[u]=r[u-1].clone(),a.crossVectors(i[u-1],i[u]),a.length()>Number.EPSILON){a.normalize();let f=Math.acos(Ht(i[u-1].dot(i[u]),-1,1));s[u].applyMatrix4(o.makeRotationAxis(a,f))}r[u].crossVectors(i[u],s[u])}if(e===!0){let u=Math.acos(Ht(s[0].dot(s[t]),-1,1));if(u/=t,i[0].dot(a.crossVectors(s[0],s[t]))>0)u=-u;for(let f=1;f<=t;f++)s[f].applyMatrix4(o.makeRotationAxis(i[f],u*f)),r[f].crossVectors(i[f],s[f])}return{tangents:i,normals:s,binormals:r}}clone(){return new this.constructor().copy(this)}copy(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}toJSON(){let t={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return t.arcLengthDivisions=this.arcLengthDivisions,t.type=this.type,t}fromJSON(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}}class lr extends cn{constructor(t=0,e=0,n=1,i=1,s=0,r=Math.PI*2,a=!1,o=0){super();this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=t,this.aY=e,this.xRadius=n,this.yRadius=i,this.aStartAngle=s,this.aEndAngle=r,this.aClockwise=a,this.aRotation=o}getPoint(t,e=new j){let n=e,i=Math.PI*2,s=this.aEndAngle-this.aStartAngle,r=Math.abs(s)<Number.EPSILON;while(s<0)s+=i;while(s>i)s-=i;if(s<Number.EPSILON)if(r)s=0;else s=i;if(this.aClockwise===!0&&!r)if(s===i)s=-i;else s=s-i;let a=this.aStartAngle+t*s,o=this.aX+this.xRadius*Math.cos(a),l=this.aY+this.yRadius*Math.sin(a);if(this.aRotation!==0){let c=Math.cos(this.aRotation),h=Math.sin(this.aRotation),d=o-this.aX,u=l-this.aY;o=d*c-u*h+this.aX,l=d*h+u*c+this.aY}return n.set(o,l)}copy(t){return super.copy(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}toJSON(){let t=super.toJSON();return t.aX=this.aX,t.aY=this.aY,t.xRadius=this.xRadius,t.yRadius=this.yRadius,t.aStartAngle=this.aStartAngle,t.aEndAngle=this.aEndAngle,t.aClockwise=this.aClockwise,t.aRotation=this.aRotation,t}fromJSON(t){return super.fromJSON(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}}class vc extends lr{constructor(t,e,n,i,s,r){super(t,e,n,n,i,s,r);this.isArcCurve=!0,this.type="ArcCurve"}}function yc(){let t=0,e=0,n=0,i=0;function s(r,a,o,l){t=r,e=o,n=-3*r+3*a-2*o-l,i=2*r-2*a+o+l}return{initCatmullRom:function(r,a,o,l,c){s(a,o,c*(o-r),c*(l-a))},initNonuniformCatmullRom:function(r,a,o,l,c,h,d){let u=(a-r)/c-(o-r)/(c+h)+(o-a)/h,f=(o-a)/h-(l-a)/(h+d)+(l-o)/d;u*=h,f*=h,s(a,o,u,f)},calc:function(r){let a=r*r,o=a*r;return t+e*r+n*a+i*o}}}var ou=new R,lu=new R,Yo=new yc,Zo=new yc,Jo=new yc;class Sc extends cn{constructor(t=[],e=!1,n="centripetal",i=0.5){super();this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=t,this.closed=e,this.curveType=n,this.tension=i}getPoint(t,e=new R){let n=e,i=this.points,s=i.length,r=(s-(this.closed?0:1))*t,a=Math.floor(r),o=r-a;if(this.closed)a+=a>0?0:(Math.floor(Math.abs(a)/s)+1)*s;else if(o===0&&a===s-1)a=s-2,o=1;let l,c;if(this.closed||a>0)l=i[(a-1)%s];else lu.subVectors(i[0],i[1]).add(i[0]),l=lu;let h=i[a%s],d=i[(a+1)%s];if(this.closed||a+2<s)c=i[(a+2)%s];else ou.subVectors(i[s-1],i[s-2]).add(i[s-1]),c=ou;if(this.curveType==="centripetal"||this.curveType==="chordal"){let u=this.curveType==="chordal"?0.5:0.25,f=Math.pow(l.distanceToSquared(h),u),m=Math.pow(h.distanceToSquared(d),u),_=Math.pow(d.distanceToSquared(c),u);if(m<0.0001)m=1;if(f<0.0001)f=m;if(_<0.0001)_=m;Yo.initNonuniformCatmullRom(l.x,h.x,d.x,c.x,f,m,_),Zo.initNonuniformCatmullRom(l.y,h.y,d.y,c.y,f,m,_),Jo.initNonuniformCatmullRom(l.z,h.z,d.z,c.z,f,m,_)}else if(this.curveType==="catmullrom")Yo.initCatmullRom(l.x,h.x,d.x,c.x,this.tension),Zo.initCatmullRom(l.y,h.y,d.y,c.y,this.tension),Jo.initCatmullRom(l.z,h.z,d.z,c.z,this.tension);return n.set(Yo.calc(o),Zo.calc(o),Jo.calc(o)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let i=t.points[e];this.points.push(i.clone())}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}toJSON(){let t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){let i=this.points[e];t.points.push(i.toArray())}return t.closed=this.closed,t.curveType=this.curveType,t.tension=this.tension,t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let i=t.points[e];this.points.push(new R().fromArray(i))}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}}function cu(t,e,n,i,s){let r=(i-e)*0.5,a=(s-n)*0.5,o=t*t,l=t*o;return(2*n-2*i+r+a)*l+(-3*n+3*i-2*r-a)*o+r*t+n}function o_(t,e){let n=1-t;return n*n*e}function l_(t,e){return 2*(1-t)*t*e}function c_(t,e){return t*t*e}function Hs(t,e,n,i){return o_(t,e)+l_(t,n)+c_(t,i)}function h_(t,e){let n=1-t;return n*n*n*e}function u_(t,e){let n=1-t;return 3*n*n*t*e}function d_(t,e){return 3*(1-t)*t*t*e}function f_(t,e){return t*t*t*e}function Vs(t,e,n,i,s){return h_(t,e)+u_(t,n)+d_(t,i)+f_(t,s)}class ka extends cn{constructor(t=new j,e=new j,n=new j,i=new j){super();this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=t,this.v1=e,this.v2=n,this.v3=i}getPoint(t,e=new j){let n=e,i=this.v0,s=this.v1,r=this.v2,a=this.v3;return n.set(Vs(t,i.x,s.x,r.x,a.x),Vs(t,i.y,s.y,r.y,a.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class Mc extends cn{constructor(t=new R,e=new R,n=new R,i=new R){super();this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=t,this.v1=e,this.v2=n,this.v3=i}getPoint(t,e=new R){let n=e,i=this.v0,s=this.v1,r=this.v2,a=this.v3;return n.set(Vs(t,i.x,s.x,r.x,a.x),Vs(t,i.y,s.y,r.y,a.y),Vs(t,i.z,s.z,r.z,a.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class Ha extends cn{constructor(t=new j,e=new j){super();this.isLineCurve=!0,this.type="LineCurve",this.v1=t,this.v2=e}getPoint(t,e=new j){let n=e;if(t===1)n.copy(this.v2);else n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1);return n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new j){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class bc extends cn{constructor(t=new R,e=new R){super();this.isLineCurve3=!0,this.type="LineCurve3",this.v1=t,this.v2=e}getPoint(t,e=new R){let n=e;if(t===1)n.copy(this.v2);else n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1);return n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new R){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class Va extends cn{constructor(t=new j,e=new j,n=new j){super();this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new j){let n=e,i=this.v0,s=this.v1,r=this.v2;return n.set(Hs(t,i.x,s.x,r.x),Hs(t,i.y,s.y,r.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class Wa extends cn{constructor(t=new R,e=new R,n=new R){super();this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new R){let n=e,i=this.v0,s=this.v1,r=this.v2;return n.set(Hs(t,i.x,s.x,r.x),Hs(t,i.y,s.y,r.y),Hs(t,i.z,s.z,r.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){let t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class Xa extends cn{constructor(t=[]){super();this.isSplineCurve=!0,this.type="SplineCurve",this.points=t}getPoint(t,e=new j){let n=e,i=this.points,s=(i.length-1)*t,r=Math.floor(s),a=s-r,o=i[r===0?r:r-1],l=i[r],c=i[r>i.length-2?i.length-1:r+1],h=i[r>i.length-3?i.length-1:r+2];return n.set(cu(a,o.x,l.x,c.x,h.x),cu(a,o.y,l.y,c.y,h.y)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let i=t.points[e];this.points.push(i.clone())}return this}toJSON(){let t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){let i=this.points[e];t.points.push(i.toArray())}return t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){let i=t.points[e];this.points.push(new j().fromArray(i))}return this}}var fa=Object.freeze({__proto__:null,ArcCurve:vc,CatmullRomCurve3:Sc,CubicBezierCurve:ka,CubicBezierCurve3:Mc,EllipseCurve:lr,LineCurve:Ha,LineCurve3:bc,QuadraticBezierCurve:Va,QuadraticBezierCurve3:Wa,SplineCurve:Xa});class Tc extends cn{constructor(){super();this.type="CurvePath",this.curves=[],this.autoClose=!1}add(t){this.curves.push(t)}closePath(){let t=this.curves[0].getPoint(0),e=this.curves[this.curves.length-1].getPoint(1);if(!t.equals(e)){let n=t.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new fa[n](e,t))}return this}getPoint(t,e){let n=t*this.getLength(),i=this.getCurveLengths(),s=0;while(s<i.length){if(i[s]>=n){let r=i[s]-n,a=this.curves[s],o=a.getLength(),l=o===0?0:1-r/o;return a.getPointAt(l,e)}s++}return null}getLength(){let t=this.getCurveLengths();return t[t.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let t=[],e=0;for(let n=0,i=this.curves.length;n<i;n++)e+=this.curves[n].getLength(),t.push(e);return this.cacheLengths=t,t}getSpacedPoints(t=40){let e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));if(this.autoClose)e.push(e[0]);return e}getPoints(t=12){let e=[],n;for(let i=0,s=this.curves;i<s.length;i++){let r=s[i],a=r.isEllipseCurve?t*2:r.isLineCurve||r.isLineCurve3?1:r.isSplineCurve?t*r.points.length:t,o=r.getPoints(a);for(let l=0;l<o.length;l++){let c=o[l];if(n&&n.equals(c))continue;e.push(c),n=c}}if(this.autoClose&&e.length>1&&!e[e.length-1].equals(e[0]))e.push(e[0]);return e}copy(t){super.copy(t),this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){let i=t.curves[e];this.curves.push(i.clone())}return this.autoClose=t.autoClose,this}toJSON(){let t=super.toJSON();t.autoClose=this.autoClose,t.curves=[];for(let e=0,n=this.curves.length;e<n;e++){let i=this.curves[e];t.curves.push(i.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.autoClose=t.autoClose,this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){let i=t.curves[e];this.curves.push(new fa[i.type]().fromJSON(i))}return this}}class hs extends Tc{constructor(t){super();if(this.type="Path",this.currentPoint=new j,t)this.setFromPoints(t)}setFromPoints(t){this.moveTo(t[0].x,t[0].y);for(let e=1,n=t.length;e<n;e++)this.lineTo(t[e].x,t[e].y);return this}moveTo(t,e){return this.currentPoint.set(t,e),this}lineTo(t,e){let n=new Ha(this.currentPoint.clone(),new j(t,e));return this.curves.push(n),this.currentPoint.set(t,e),this}quadraticCurveTo(t,e,n,i){let s=new Va(this.currentPoint.clone(),new j(t,e),new j(n,i));return this.curves.push(s),this.currentPoint.set(n,i),this}bezierCurveTo(t,e,n,i,s,r){let a=new ka(this.currentPoint.clone(),new j(t,e),new j(n,i),new j(s,r));return this.curves.push(a),this.currentPoint.set(s,r),this}splineThru(t){let e=[this.currentPoint.clone()].concat(t),n=new Xa(e);return this.curves.push(n),this.currentPoint.copy(t[t.length-1]),this}arc(t,e,n,i,s,r){let a=this.currentPoint.x,o=this.currentPoint.y;return this.absarc(t+a,e+o,n,i,s,r),this}absarc(t,e,n,i,s,r){return this.absellipse(t,e,n,n,i,s,r),this}ellipse(t,e,n,i,s,r,a,o){let l=this.currentPoint.x,c=this.currentPoint.y;return this.absellipse(t+l,e+c,n,i,s,r,a,o),this}absellipse(t,e,n,i,s,r,a,o){let l=new lr(t,e,n,i,s,r,a,o);if(this.curves.length>0){let h=l.getPoint(0);if(!h.equals(this.currentPoint))this.lineTo(h.x,h.y)}this.curves.push(l);let c=l.getPoint(1);return this.currentPoint.copy(c),this}copy(t){return super.copy(t),this.currentPoint.copy(t.currentPoint),this}toJSON(){let t=super.toJSON();return t.currentPoint=this.currentPoint.toArray(),t}fromJSON(t){return super.fromJSON(t),this.currentPoint.fromArray(t.currentPoint),this}}class Ss extends hs{constructor(t){super(t);this.uuid=nn(),this.type="Shape",this.holes=[]}getPointsHoles(t){let e=[];for(let n=0,i=this.holes.length;n<i;n++)e[n]=this.holes[n].getPoints(t);return e}extractPoints(t){return{shape:this.getPoints(t),holes:this.getPointsHoles(t)}}copy(t){super.copy(t),this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){let i=t.holes[e];this.holes.push(i.clone())}return this}toJSON(){let t=super.toJSON();t.uuid=this.uuid,t.holes=[];for(let e=0,n=this.holes.length;e<n;e++){let i=this.holes[e];t.holes.push(i.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.uuid=t.uuid,this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){let i=t.holes[e];this.holes.push(new hs().fromJSON(i))}return this}}function p_(t,e,n=2){let i=e&&e.length,s=i?e[0]*n:t.length,r=hf(t,0,s,n,!0),a=[];if(!r||r.next===r.prev)return a;let o,l,c;if(i)r=v_(t,e,r,n);if(t.length>80*n){o=t[0],l=t[1];let h=o,d=l;for(let u=n;u<s;u+=n){let f=t[u],m=t[u+1];if(f<o)o=f;if(m<l)l=m;if(f>h)h=f;if(m>d)d=m}c=Math.max(h-o,d-l),c=c!==0?32767/c:0}return qs(r,a,n,o,l,c,0),a}function hf(t,e,n,i,s){let r;if(s===I_(t,e,n,i)>0)for(let a=e;a<n;a+=i)r=hu(a/i|0,t[a],t[a+1],r);else for(let a=n-i;a>=e;a-=i)r=hu(a/i|0,t[a],t[a+1],r);if(r&&us(r,r.next))Zs(r),r=r.next;return r}function Ai(t,e){if(!t)return t;if(!e)e=t;let n=t,i;do if(i=!1,!n.steiner&&(us(n,n.next)||ye(n.prev,n,n.next)===0)){if(Zs(n),n=e=n.prev,n===n.next)break;i=!0}else n=n.next;while(i||n!==e);return e}function qs(t,e,n,i,s,r,a){if(!t)return;if(!a&&r)T_(t,i,s,r);let o=t;while(t.prev!==t.next){let l=t.prev,c=t.next;if(r?g_(t,i,s,r):m_(t)){e.push(l.i,t.i,c.i),Zs(t),t=c.next,o=c.next;continue}if(t=c,t===o){if(!a)qs(Ai(t),e,n,i,s,r,1);else if(a===1)t=__(Ai(t),e),qs(t,e,n,i,s,r,2);else if(a===2)x_(t,e,n,i,s,r);break}}}function m_(t){let e=t.prev,n=t,i=t.next;if(ye(e,n,i)>=0)return!1;let s=e.x,r=n.x,a=i.x,o=e.y,l=n.y,c=i.y,h=Math.min(s,r,a),d=Math.min(o,l,c),u=Math.max(s,r,a),f=Math.max(o,l,c),m=i.next;while(m!==e){if(m.x>=h&&m.x<=u&&m.y>=d&&m.y<=f&&Gs(s,o,r,l,a,c,m.x,m.y)&&ye(m.prev,m,m.next)>=0)return!1;m=m.next}return!0}function g_(t,e,n,i){let s=t.prev,r=t,a=t.next;if(ye(s,r,a)>=0)return!1;let o=s.x,l=r.x,c=a.x,h=s.y,d=r.y,u=a.y,f=Math.min(o,l,c),m=Math.min(h,d,u),_=Math.max(o,l,c),g=Math.max(h,d,u),p=sl(f,m,e,n,i),S=sl(_,g,e,n,i),{prevZ:E,nextZ:x}=t;while(E&&E.z>=p&&x&&x.z<=S){if(E.x>=f&&E.x<=_&&E.y>=m&&E.y<=g&&E!==s&&E!==a&&Gs(o,h,l,d,c,u,E.x,E.y)&&ye(E.prev,E,E.next)>=0)return!1;if(E=E.prevZ,x.x>=f&&x.x<=_&&x.y>=m&&x.y<=g&&x!==s&&x!==a&&Gs(o,h,l,d,c,u,x.x,x.y)&&ye(x.prev,x,x.next)>=0)return!1;x=x.nextZ}while(E&&E.z>=p){if(E.x>=f&&E.x<=_&&E.y>=m&&E.y<=g&&E!==s&&E!==a&&Gs(o,h,l,d,c,u,E.x,E.y)&&ye(E.prev,E,E.next)>=0)return!1;E=E.prevZ}while(x&&x.z<=S){if(x.x>=f&&x.x<=_&&x.y>=m&&x.y<=g&&x!==s&&x!==a&&Gs(o,h,l,d,c,u,x.x,x.y)&&ye(x.prev,x,x.next)>=0)return!1;x=x.nextZ}return!0}function __(t,e){let n=t;do{let i=n.prev,s=n.next.next;if(!us(i,s)&&df(i,n,n.next,s)&&Ys(i,s)&&Ys(s,i))e.push(i.i,n.i,s.i),Zs(n),Zs(n.next),n=t=s;n=n.next}while(n!==t);return Ai(n)}function x_(t,e,n,i,s,r){let a=t;do{let o=a.next.next;while(o!==a.prev){if(a.i!==o.i&&w_(a,o)){let l=ff(a,o);a=Ai(a,a.next),l=Ai(l,l.next),qs(a,e,n,i,s,r,0),qs(l,e,n,i,s,r,0);return}o=o.next}a=a.next}while(a!==t)}function v_(t,e,n,i){let s=[];for(let r=0,a=e.length;r<a;r++){let o=e[r]*i,l=r<a-1?e[r+1]*i:t.length,c=hf(t,o,l,i,!1);if(c===c.next)c.steiner=!0;s.push(A_(c))}s.sort(y_);for(let r=0;r<s.length;r++)n=S_(s[r],n);return n}function y_(t,e){let n=t.x-e.x;if(n===0){if(n=t.y-e.y,n===0){let i=(t.next.y-t.y)/(t.next.x-t.x),s=(e.next.y-e.y)/(e.next.x-e.x);n=i-s}}return n}function S_(t,e){let n=M_(t,e);if(!n)return e;let i=ff(n,t);return Ai(i,i.next),Ai(n,n.next)}function M_(t,e){let n=e,{x:i,y:s}=t,r=-1/0,a;if(us(t,n))return n;do{if(us(t,n.next))return n.next;else if(s<=n.y&&s>=n.next.y&&n.next.y!==n.y){let d=n.x+(s-n.y)*(n.next.x-n.x)/(n.next.y-n.y);if(d<=i&&d>r){if(r=d,a=n.x<n.next.x?n:n.next,d===i)return a}}n=n.next}while(n!==e);if(!a)return null;let o=a,l=a.x,c=a.y,h=1/0;n=a;do{if(i>=n.x&&n.x>=l&&i!==n.x&&uf(s<c?i:r,s,l,c,s<c?r:i,s,n.x,n.y)){let d=Math.abs(s-n.y)/(i-n.x);if(Ys(n,t)&&(d<h||d===h&&(n.x>a.x||n.x===a.x&&b_(a,n))))a=n,h=d}n=n.next}while(n!==o);return a}function b_(t,e){return ye(t.prev,t,e.prev)<0&&ye(e.next,t,t.next)<0}function T_(t,e,n,i){let s=t;do{if(s.z===0)s.z=sl(s.x,s.y,e,n,i);s.prevZ=s.prev,s.nextZ=s.next,s=s.next}while(s!==t);s.prevZ.nextZ=null,s.prevZ=null,E_(s)}function E_(t){let e,n=1;do{let i=t,s;t=null;let r=null;e=0;while(i){e++;let a=i,o=0;for(let c=0;c<n;c++)if(o++,a=a.nextZ,!a)break;let l=n;while(o>0||l>0&&a){if(o!==0&&(l===0||!a||i.z<=a.z))s=i,i=i.nextZ,o--;else s=a,a=a.nextZ,l--;if(r)r.nextZ=s;else t=s;s.prevZ=r,r=s}i=a}r.nextZ=null,n*=2}while(e>1);return t}function sl(t,e,n,i,s){return t=(t-n)*s|0,e=(e-i)*s|0,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,t|e<<1}function A_(t){let e=t,n=t;do{if(e.x<n.x||e.x===n.x&&e.y<n.y)n=e;e=e.next}while(e!==t);return n}function uf(t,e,n,i,s,r,a,o){return(s-a)*(e-o)>=(t-a)*(r-o)&&(t-a)*(i-o)>=(n-a)*(e-o)&&(n-a)*(r-o)>=(s-a)*(i-o)}function Gs(t,e,n,i,s,r,a,o){return!(t===a&&e===o)&&uf(t,e,n,i,s,r,a,o)}function w_(t,e){return t.next.i!==e.i&&t.prev.i!==e.i&&!C_(t,e)&&(Ys(t,e)&&Ys(e,t)&&R_(t,e)&&(ye(t.prev,t,e.prev)||ye(t,e.prev,e))||us(t,e)&&ye(t.prev,t,t.next)>0&&ye(e.prev,e,e.next)>0)}function ye(t,e,n){return(e.y-t.y)*(n.x-e.x)-(e.x-t.x)*(n.y-e.y)}function us(t,e){return t.x===e.x&&t.y===e.y}function df(t,e,n,i){let s=ea(ye(t,e,n)),r=ea(ye(t,e,i)),a=ea(ye(n,i,t)),o=ea(ye(n,i,e));if(s!==r&&a!==o)return!0;if(s===0&&ta(t,n,e))return!0;if(r===0&&ta(t,i,e))return!0;if(a===0&&ta(n,t,i))return!0;if(o===0&&ta(n,e,i))return!0;return!1}function ta(t,e,n){return e.x<=Math.max(t.x,n.x)&&e.x>=Math.min(t.x,n.x)&&e.y<=Math.max(t.y,n.y)&&e.y>=Math.min(t.y,n.y)}function ea(t){return t>0?1:t<0?-1:0}function C_(t,e){let n=t;do{if(n.i!==t.i&&n.next.i!==t.i&&n.i!==e.i&&n.next.i!==e.i&&df(n,n.next,t,e))return!0;n=n.next}while(n!==t);return!1}function Ys(t,e){return ye(t.prev,t,t.next)<0?ye(t,e,t.next)>=0&&ye(t,t.prev,e)>=0:ye(t,e,t.prev)<0||ye(t,t.next,e)<0}function R_(t,e){let n=t,i=!1,s=(t.x+e.x)/2,r=(t.y+e.y)/2;do{if(n.y>r!==n.next.y>r&&n.next.y!==n.y&&s<(n.next.x-n.x)*(r-n.y)/(n.next.y-n.y)+n.x)i=!i;n=n.next}while(n!==t);return i}function ff(t,e){let n=rl(t.i,t.x,t.y),i=rl(e.i,e.x,e.y),s=t.next,r=e.prev;return t.next=e,e.prev=t,n.next=s,s.prev=n,i.next=n,n.prev=i,r.next=i,i.prev=r,i}function hu(t,e,n,i){let s=rl(t,e,n);if(!i)s.prev=s,s.next=s;else s.next=i.next,s.prev=i,i.next.prev=s,i.next=s;return s}function Zs(t){if(t.next.prev=t.prev,t.prev.next=t.next,t.prevZ)t.prevZ.nextZ=t.nextZ;if(t.nextZ)t.nextZ.prevZ=t.prevZ}function rl(t,e,n){return{i:t,x:e,y:n,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function I_(t,e,n,i){let s=0;for(let r=e,a=n-i;r<n;r+=i)s+=(t[a]-t[r])*(t[r+1]+t[a+1]),a=r;return s}class pf{static triangulate(t,e,n=2){return p_(t,e,n)}}class pn{static area(t){let e=t.length,n=0;for(let i=e-1,s=0;s<e;i=s++)n+=t[i].x*t[s].y-t[s].x*t[i].y;return n*0.5}static isClockWise(t){return pn.area(t)<0}static triangulateShape(t,e){let n=[],i=[],s=[];uu(t),du(n,t);let r=t.length;e.forEach(uu);for(let o=0;o<e.length;o++)i.push(r),r+=e[o].length,du(n,e[o]);let a=pf.triangulate(n,i);for(let o=0;o<a.length;o+=3)s.push(a.slice(o,o+3));return s}}function uu(t){let e=t.length;if(e>2&&t[e-1].equals(t[0]))t.pop()}function du(t,e){for(let n=0;n<e.length;n++)t.push(e[n].x),t.push(e[n].y)}class qa extends Wt{constructor(t=new Ss([new j(0.5,0.5),new j(-0.5,0.5),new j(-0.5,-0.5),new j(0.5,-0.5)]),e={}){super();this.type="ExtrudeGeometry",this.parameters={shapes:t,options:e},t=Array.isArray(t)?t:[t];let n=this,i=[],s=[];for(let a=0,o=t.length;a<o;a++){let l=t[a];r(l)}this.setAttribute("position",new Tt(i,3)),this.setAttribute("uv",new Tt(s,2)),this.computeVertexNormals();function r(a){let o=[],l=e.curveSegments!==void 0?e.curveSegments:12,c=e.steps!==void 0?e.steps:1,h=e.depth!==void 0?e.depth:1,d=e.bevelEnabled!==void 0?e.bevelEnabled:!0,u=e.bevelThickness!==void 0?e.bevelThickness:0.2,f=e.bevelSize!==void 0?e.bevelSize:u-0.1,m=e.bevelOffset!==void 0?e.bevelOffset:0,_=e.bevelSegments!==void 0?e.bevelSegments:3,g=e.extrudePath,p=e.UVGenerator!==void 0?e.UVGenerator:P_,S,E=!1,x,T,C,w;if(g){S=g.getSpacedPoints(c),E=!0,d=!1;let tt=g.isCatmullRomCurve3?g.closed:!1;x=g.computeFrenetFrames(c,tt),T=new R,C=new R,w=new R}if(!d)_=0,u=0,f=0,m=0;let v=a.extractPoints(l),{shape:b,holes:O}=v;if(!pn.isClockWise(b)){b=b.reverse();for(let tt=0,st=O.length;tt<st;tt++){let ot=O[tt];if(pn.isClockWise(ot))O[tt]=ot.reverse()}}function F(tt){let ct=tt[0];for(let St=1;St<=tt.length;St++){let Nt=St%tt.length,Bt=tt[Nt],qt=Bt.x-ct.x,Yt=Bt.y-ct.y,I=qt*qt+Yt*Yt,fe=Math.max(Math.abs(Bt.x),Math.abs(Bt.y),Math.abs(ct.x),Math.abs(ct.y)),jt=0.000000000000000000010000000000000001*fe*fe;if(I<=jt){tt.splice(Nt,1),St--;continue}ct=Bt}}F(b),O.forEach(F);let Z=O.length,P=b;for(let tt=0;tt<Z;tt++){let st=O[tt];b=b.concat(st)}function G(tt,st,ot){if(!st)Lt("ExtrudeGeometry: vec does not exist");return tt.clone().addScaledVector(st,ot)}let J=b.length;function k(tt,st,ot){let ct,St,Nt,Bt=tt.x-st.x,qt=tt.y-st.y,Yt=ot.x-tt.x,I=ot.y-tt.y,fe=Bt*Bt+qt*qt,jt=Bt*I-qt*Yt;if(Math.abs(jt)>Number.EPSILON){let te=Math.sqrt(fe),A=Math.sqrt(Yt*Yt+I*I),y=st.x-qt/te,N=st.y+Bt/te,H=ot.x-I/A,et=ot.y+Yt/A,ht=((H-y)*I-(et-N)*Yt)/(Bt*I-qt*Yt);ct=y+Bt*ht-tt.x,St=N+qt*ht-tt.y;let ft=ct*ct+St*St;if(ft<=2)return new j(ct,St);else Nt=Math.sqrt(ft/2)}else{let te=!1;if(Bt>Number.EPSILON){if(Yt>Number.EPSILON)te=!0}else if(Bt<-Number.EPSILON){if(Yt<-Number.EPSILON)te=!0}else if(Math.sign(qt)===Math.sign(I))te=!0;if(te)ct=-qt,St=Bt,Nt=Math.sqrt(fe);else ct=Bt,St=qt,Nt=Math.sqrt(fe/2)}return new j(ct/Nt,St/Nt)}let at=[];for(let tt=0,st=P.length,ot=st-1,ct=tt+1;tt<st;tt++,ot++,ct++){if(ot===st)ot=0;if(ct===st)ct=0;at[tt]=k(P[tt],P[ot],P[ct])}let W=[],Q,it=at.concat();for(let tt=0,st=Z;tt<st;tt++){let ot=O[tt];Q=[];for(let ct=0,St=ot.length,Nt=St-1,Bt=ct+1;ct<St;ct++,Nt++,Bt++){if(Nt===St)Nt=0;if(Bt===St)Bt=0;Q[ct]=k(ot[ct],ot[Nt],ot[Bt])}W.push(Q),it=it.concat(Q)}let Dt;if(_===0)Dt=pn.triangulateShape(P,O);else{let tt=[],st=[];for(let ot=0;ot<_;ot++){let ct=ot/_,St=u*Math.cos(ct*Math.PI/2),Nt=f*Math.sin(ct*Math.PI/2)+m;for(let Bt=0,qt=P.length;Bt<qt;Bt++){let Yt=G(P[Bt],at[Bt],Nt);if(rt(Yt.x,Yt.y,-St),ct===0)tt.push(Yt)}for(let Bt=0,qt=Z;Bt<qt;Bt++){let Yt=O[Bt];Q=W[Bt];let I=[];for(let fe=0,jt=Yt.length;fe<jt;fe++){let te=G(Yt[fe],Q[fe],Nt);if(rt(te.x,te.y,-St),ct===0)I.push(te)}if(ct===0)st.push(I)}}Dt=pn.triangulateShape(tt,st)}let Ft=Dt.length,he=f+m;for(let tt=0;tt<J;tt++){let st=d?G(b[tt],it[tt],he):b[tt];if(!E)rt(st.x,st.y,0);else C.copy(x.normals[0]).multiplyScalar(st.x),T.copy(x.binormals[0]).multiplyScalar(st.y),w.copy(S[0]).add(C).add(T),rt(w.x,w.y,w.z)}for(let tt=1;tt<=c;tt++)for(let st=0;st<J;st++){let ot=d?G(b[st],it[st],he):b[st];if(!E)rt(ot.x,ot.y,h/c*tt);else C.copy(x.normals[tt]).multiplyScalar(ot.x),T.copy(x.binormals[tt]).multiplyScalar(ot.y),w.copy(S[tt]).add(C).add(T),rt(w.x,w.y,w.z)}for(let tt=_-1;tt>=0;tt--){let st=tt/_,ot=u*Math.cos(st*Math.PI/2),ct=f*Math.sin(st*Math.PI/2)+m;for(let St=0,Nt=P.length;St<Nt;St++){let Bt=G(P[St],at[St],ct);rt(Bt.x,Bt.y,h+ot)}for(let St=0,Nt=O.length;St<Nt;St++){let Bt=O[St];Q=W[St];for(let qt=0,Yt=Bt.length;qt<Yt;qt++){let I=G(Bt[qt],Q[qt],ct);if(!E)rt(I.x,I.y,h+ot);else rt(I.x,I.y+S[c-1].y,S[c-1].x+ot)}}}$t(),q();function $t(){let tt=i.length/3;if(d){let st=0,ot=J*st;for(let ct=0;ct<Ft;ct++){let St=Dt[ct];Ot(St[2]+ot,St[1]+ot,St[0]+ot)}st=c+_*2,ot=J*st;for(let ct=0;ct<Ft;ct++){let St=Dt[ct];Ot(St[0]+ot,St[1]+ot,St[2]+ot)}}else{for(let st=0;st<Ft;st++){let ot=Dt[st];Ot(ot[2],ot[1],ot[0])}for(let st=0;st<Ft;st++){let ot=Dt[st];Ot(ot[0]+J*c,ot[1]+J*c,ot[2]+J*c)}}n.addGroup(tt,i.length/3-tt,0)}function q(){let tt=i.length/3,st=0;lt(P,st),st+=P.length;for(let ot=0,ct=O.length;ot<ct;ot++){let St=O[ot];lt(St,st),st+=St.length}n.addGroup(tt,i.length/3-tt,1)}function lt(tt,st){let ot=tt.length;while(--ot>=0){let ct=ot,St=ot-1;if(St<0)St=tt.length-1;for(let Nt=0,Bt=c+_*2;Nt<Bt;Nt++){let qt=J*Nt,Yt=J*(Nt+1),I=st+ct+qt,fe=st+St+qt,jt=st+St+Yt,te=st+ct+Yt;Gt(I,fe,jt,te)}}}function rt(tt,st,ot){o.push(tt),o.push(st),o.push(ot)}function Ot(tt,st,ot){Ct(tt),Ct(st),Ct(ot);let ct=i.length/3,St=p.generateTopUV(n,i,ct-3,ct-2,ct-1);ue(St[0]),ue(St[1]),ue(St[2])}function Gt(tt,st,ot,ct){Ct(tt),Ct(st),Ct(ct),Ct(st),Ct(ot),Ct(ct);let St=i.length/3,Nt=p.generateSideWallUV(n,i,St-6,St-3,St-2,St-1);ue(Nt[0]),ue(Nt[1]),ue(Nt[3]),ue(Nt[1]),ue(Nt[2]),ue(Nt[3])}function Ct(tt){i.push(o[tt*3+0]),i.push(o[tt*3+1]),i.push(o[tt*3+2])}function ue(tt){s.push(tt.x),s.push(tt.y)}}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){let t=super.toJSON(),e=this.parameters.shapes,n=this.parameters.options;return L_(e,n,t)}static fromJSON(t,e){let n=[];for(let s=0,r=t.shapes.length;s<r;s++){let a=e[t.shapes[s]];n.push(a)}let i=t.options.extrudePath;if(i!==void 0)t.options.extrudePath=new fa[i.type]().fromJSON(i);return new qa(n,t.options)}}var P_={generateTopUV:function(t,e,n,i,s){let r=e[n*3],a=e[n*3+1],o=e[i*3],l=e[i*3+1],c=e[s*3],h=e[s*3+1];return[new j(r,a),new j(o,l),new j(c,h)]},generateSideWallUV:function(t,e,n,i,s,r){let a=e[n*3],o=e[n*3+1],l=e[n*3+2],c=e[i*3],h=e[i*3+1],d=e[i*3+2],u=e[s*3],f=e[s*3+1],m=e[s*3+2],_=e[r*3],g=e[r*3+1],p=e[r*3+2];if(Math.abs(o-h)<Math.abs(a-c))return[new j(a,1-l),new j(c,1-d),new j(u,1-m),new j(_,1-p)];else return[new j(o,1-l),new j(h,1-d),new j(f,1-m),new j(g,1-p)]}};function L_(t,e,n){if(n.shapes=[],Array.isArray(t))for(let i=0,s=t.length;i<s;i++){let r=t[i];n.shapes.push(r.uuid)}else n.shapes.push(t.uuid);if(n.options=Object.assign({},e),e.extrudePath!==void 0)n.options.extrudePath=e.extrudePath.toJSON();return n}class Ya extends ai{constructor(t=1,e=0){let n=(1+Math.sqrt(5))/2,i=[-1,n,0,1,n,0,-1,-n,0,1,-n,0,0,-1,n,0,1,n,0,-1,-n,0,1,-n,n,0,-1,n,0,1,-n,0,-1,-n,0,1],s=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1];super(i,s,t,e);this.type="IcosahedronGeometry",this.parameters={radius:t,detail:e}}static fromJSON(t){return new Ya(t.radius,t.detail)}}class Za extends Wt{constructor(t=[new j(0,-0.5),new j(0.5,0),new j(0,0.5)],e=12,n=0,i=Math.PI*2){super();this.type="LatheGeometry",this.parameters={points:t,segments:e,phiStart:n,phiLength:i},e=Math.floor(e),i=Ht(i,0,Math.PI*2);let s=[],r=[],a=[],o=[],l=[],c=1/e,h=new R,d=new j,u=new R,f=new R,m=new R,_=0,g=0;for(let p=0;p<=t.length-1;p++)switch(p){case 0:_=t[p+1].x-t[p].x,g=t[p+1].y-t[p].y,u.x=g*1,u.y=-_,u.z=g*0,m.copy(u),u.normalize(),o.push(u.x,u.y,u.z);break;case t.length-1:o.push(m.x,m.y,m.z);break;default:_=t[p+1].x-t[p].x,g=t[p+1].y-t[p].y,u.x=g*1,u.y=-_,u.z=g*0,f.copy(u),u.x+=m.x,u.y+=m.y,u.z+=m.z,u.normalize(),o.push(u.x,u.y,u.z),m.copy(f)}for(let p=0;p<=e;p++){let S=n+p*c*i,E=Math.sin(S),x=Math.cos(S);for(let T=0;T<=t.length-1;T++){h.x=t[T].x*E,h.y=t[T].y,h.z=t[T].x*x,r.push(h.x,h.y,h.z),d.x=p/e,d.y=T/(t.length-1),a.push(d.x,d.y);let C=o[3*T+0]*E,w=o[3*T+1],v=o[3*T+0]*x;l.push(C,w,v)}}for(let p=0;p<e;p++)for(let S=0;S<t.length-1;S++){let E=S+p*t.length,x=E,T=E+t.length,C=E+t.length+1,w=E+1;s.push(x,T,w),s.push(C,w,T)}this.setIndex(s),this.setAttribute("position",new Tt(r,3)),this.setAttribute("uv",new Tt(a,2)),this.setAttribute("normal",new Tt(l,3))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Za(t.points,t.segments,t.phiStart,t.phiLength)}}class cr extends ai{constructor(t=1,e=0){let n=[1,0,0,-1,0,0,0,1,0,0,-1,0,0,0,1,0,0,-1],i=[0,2,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,3,1,3,4,1,4,2];super(n,i,t,e);this.type="OctahedronGeometry",this.parameters={radius:t,detail:e}}static fromJSON(t){return new cr(t.radius,t.detail)}}class Ms extends Wt{constructor(t=1,e=1,n=1,i=1){super();this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:i};let s=t/2,r=e/2,a=Math.floor(n),o=Math.floor(i),l=a+1,c=o+1,h=t/a,d=e/o,u=[],f=[],m=[],_=[];for(let g=0;g<c;g++){let p=g*d-r;for(let S=0;S<l;S++){let E=S*h-s;f.push(E,-p,0),m.push(0,0,1),_.push(S/a),_.push(1-g/o)}}for(let g=0;g<o;g++)for(let p=0;p<a;p++){let S=p+l*g,E=p+l*(g+1),x=p+1+l*(g+1),T=p+1+l*g;u.push(S,E,T),u.push(E,x,T)}this.setIndex(u),this.setAttribute("position",new Tt(f,3)),this.setAttribute("normal",new Tt(m,3)),this.setAttribute("uv",new Tt(_,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Ms(t.width,t.height,t.widthSegments,t.heightSegments)}}class Ja extends Wt{constructor(t=0.5,e=1,n=32,i=1,s=0,r=Math.PI*2){super();this.type="RingGeometry",this.parameters={innerRadius:t,outerRadius:e,thetaSegments:n,phiSegments:i,thetaStart:s,thetaLength:r},n=Math.max(3,n),i=Math.max(1,i);let a=[],o=[],l=[],c=[],h=t,d=(e-t)/i,u=new R,f=new j;for(let m=0;m<=i;m++){for(let _=0;_<=n;_++){let g=s+_/n*r;u.x=h*Math.cos(g),u.y=h*Math.sin(g),o.push(u.x,u.y,u.z),l.push(0,0,1),f.x=(u.x/e+1)/2,f.y=(u.y/e+1)/2,c.push(f.x,f.y)}h+=d}for(let m=0;m<i;m++){let _=m*(n+1);for(let g=0;g<n;g++){let p=g+_,S=p,E=p+n+1,x=p+n+2,T=p+1;a.push(S,E,T),a.push(E,x,T)}}this.setIndex(a),this.setAttribute("position",new Tt(o,3)),this.setAttribute("normal",new Tt(l,3)),this.setAttribute("uv",new Tt(c,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Ja(t.innerRadius,t.outerRadius,t.thetaSegments,t.phiSegments,t.thetaStart,t.thetaLength)}}class $a extends Wt{constructor(t=new Ss([new j(0,0.5),new j(-0.5,-0.5),new j(0.5,-0.5)]),e=12){super();this.type="ShapeGeometry",this.parameters={shapes:t,curveSegments:e};let n=[],i=[],s=[],r=[],a=0,o=0;if(Array.isArray(t)===!1)l(t);else for(let c=0;c<t.length;c++)l(t[c]),this.addGroup(a,o,c),a+=o,o=0;this.setIndex(n),this.setAttribute("position",new Tt(i,3)),this.setAttribute("normal",new Tt(s,3)),this.setAttribute("uv",new Tt(r,2));function l(c){let h=i.length/3,d=c.extractPoints(e),{shape:u,holes:f}=d;if(pn.isClockWise(u)===!1)u=u.reverse();for(let _=0,g=f.length;_<g;_++){let p=f[_];if(pn.isClockWise(p)===!0)f[_]=p.reverse()}let m=pn.triangulateShape(u,f);for(let _=0,g=f.length;_<g;_++){let p=f[_];u=u.concat(p)}for(let _=0,g=u.length;_<g;_++){let p=u[_];i.push(p.x,p.y,0),s.push(0,0,1),r.push(p.x,p.y)}for(let _=0,g=m.length;_<g;_++){let p=m[_],S=p[0]+h,E=p[1]+h,x=p[2]+h;n.push(S,E,x),o+=3}}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){let t=super.toJSON(),e=this.parameters.shapes;return N_(e,t)}static fromJSON(t,e){let n=[];for(let i=0,s=t.shapes.length;i<s;i++){let r=e[t.shapes[i]];n.push(r)}return new $a(n,t.curveSegments)}}function N_(t,e){if(e.shapes=[],Array.isArray(t))for(let n=0,i=t.length;n<i;n++){let s=t[n];e.shapes.push(s.uuid)}else e.shapes.push(t.uuid);return e}class hr extends Wt{constructor(t=1,e=32,n=16,i=0,s=Math.PI*2,r=0,a=Math.PI){super();this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:n,phiStart:i,phiLength:s,thetaStart:r,thetaLength:a},e=Math.max(3,Math.floor(e)),n=Math.max(2,Math.floor(n));let o=Math.min(r+a,Math.PI),l=0,c=[],h=new R,d=new R,u=[],f=[],m=[],_=[];for(let g=0;g<=n;g++){let p=[],S=g/n,E=r+S*a,x=t*Math.cos(E),T=Math.sqrt(t*t-x*x),C=0;if(g===0&&r===0)C=0.5/e;else if(g===n&&o===Math.PI)C=-0.5/e;for(let w=0;w<=e;w++){let v=w/e,b=i+v*s;h.x=-T*Math.cos(b),h.y=x,h.z=T*Math.sin(b),f.push(h.x,h.y,h.z),d.copy(h).normalize(),m.push(d.x,d.y,d.z),_.push(v+C,1-S),p.push(l++)}c.push(p)}for(let g=0;g<n;g++)for(let p=0;p<e;p++){let S=c[g][p+1],E=c[g][p],x=c[g+1][p],T=c[g+1][p+1];if(g!==0||r>0)u.push(S,E,T);if(g!==n-1||o<Math.PI)u.push(E,x,T)}this.setIndex(u),this.setAttribute("position",new Tt(f,3)),this.setAttribute("normal",new Tt(m,3)),this.setAttribute("uv",new Tt(_,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new hr(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}}class Ka extends ai{constructor(t=1,e=0){let n=[1,1,1,-1,-1,1,-1,1,-1,1,-1,-1],i=[2,1,0,0,3,2,1,3,0,2,3,1];super(n,i,t,e);this.type="TetrahedronGeometry",this.parameters={radius:t,detail:e}}static fromJSON(t){return new Ka(t.radius,t.detail)}}class Qa extends Wt{constructor(t=1,e=0.4,n=12,i=48,s=Math.PI*2,r=0,a=Math.PI*2){super();this.type="TorusGeometry",this.parameters={radius:t,tube:e,radialSegments:n,tubularSegments:i,arc:s,thetaStart:r,thetaLength:a},n=Math.floor(n),i=Math.floor(i);let o=[],l=[],c=[],h=[],d=new R,u=new R,f=new R;for(let m=0;m<=n;m++){let _=r+m/n*a;for(let g=0;g<=i;g++){let p=g/i*s;u.x=(t+e*Math.cos(_))*Math.cos(p),u.y=(t+e*Math.cos(_))*Math.sin(p),u.z=e*Math.sin(_),l.push(u.x,u.y,u.z),d.x=t*Math.cos(p),d.y=t*Math.sin(p),f.subVectors(u,d).normalize(),c.push(f.x,f.y,f.z),h.push(g/i),h.push(m/n)}}for(let m=1;m<=n;m++)for(let _=1;_<=i;_++){let g=(i+1)*m+_-1,p=(i+1)*(m-1)+_-1,S=(i+1)*(m-1)+_,E=(i+1)*m+_;o.push(g,p,E),o.push(p,S,E)}this.setIndex(o),this.setAttribute("position",new Tt(l,3)),this.setAttribute("normal",new Tt(c,3)),this.setAttribute("uv",new Tt(h,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Qa(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc,t.thetaStart,t.thetaLength)}}class ja extends Wt{constructor(t=1,e=0.4,n=64,i=8,s=2,r=3){super();this.type="TorusKnotGeometry",this.parameters={radius:t,tube:e,tubularSegments:n,radialSegments:i,p:s,q:r},n=Math.floor(n),i=Math.floor(i);let a=[],o=[],l=[],c=[],h=new R,d=new R,u=new R,f=new R,m=new R,_=new R,g=new R;for(let S=0;S<=n;++S){let E=S/n*s*Math.PI*2;p(E,s,r,t,u),p(E+0.01,s,r,t,f),_.subVectors(f,u),g.addVectors(f,u),m.crossVectors(_,g),g.crossVectors(m,_),m.normalize(),g.normalize();for(let x=0;x<=i;++x){let T=x/i*Math.PI*2,C=-e*Math.cos(T),w=e*Math.sin(T);h.x=u.x+(C*g.x+w*m.x),h.y=u.y+(C*g.y+w*m.y),h.z=u.z+(C*g.z+w*m.z),o.push(h.x,h.y,h.z),d.subVectors(h,u).normalize(),l.push(d.x,d.y,d.z),c.push(S/n),c.push(x/i)}}for(let S=1;S<=n;S++)for(let E=1;E<=i;E++){let x=(i+1)*(S-1)+(E-1),T=(i+1)*S+(E-1),C=(i+1)*S+E,w=(i+1)*(S-1)+E;a.push(x,T,w),a.push(T,C,w)}this.setIndex(a),this.setAttribute("position",new Tt(o,3)),this.setAttribute("normal",new Tt(l,3)),this.setAttribute("uv",new Tt(c,2));function p(S,E,x,T,C){let w=Math.cos(S),v=Math.sin(S),b=x/E*S,O=Math.cos(b);C.x=T*(2+O)*0.5*w,C.y=T*(2+O)*v*0.5,C.z=T*Math.sin(b)*0.5}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new ja(t.radius,t.tube,t.tubularSegments,t.radialSegments,t.p,t.q)}}class to extends Wt{constructor(t=new Wa(new R(-1,-1,0),new R(-1,1,0),new R(1,1,0)),e=64,n=1,i=8,s=!1){super();this.type="TubeGeometry",this.parameters={path:t,tubularSegments:e,radius:n,radialSegments:i,closed:s};let r=t.computeFrenetFrames(e,s);this.tangents=r.tangents,this.normals=r.normals,this.binormals=r.binormals;let a=new R,o=new R,l=new j,c=new R,h=[],d=[],u=[],f=[];m(),this.setIndex(f),this.setAttribute("position",new Tt(h,3)),this.setAttribute("normal",new Tt(d,3)),this.setAttribute("uv",new Tt(u,2));function m(){for(let S=0;S<e;S++)_(S);_(s===!1?e:0),p(),g()}function _(S){c=t.getPointAt(S/e,c);let E=r.normals[S],x=r.binormals[S];for(let T=0;T<=i;T++){let C=T/i*Math.PI*2,w=Math.sin(C),v=-Math.cos(C);o.x=v*E.x+w*x.x,o.y=v*E.y+w*x.y,o.z=v*E.z+w*x.z,o.normalize(),d.push(o.x,o.y,o.z),a.x=c.x+n*o.x,a.y=c.y+n*o.y,a.z=c.z+n*o.z,h.push(a.x,a.y,a.z)}}function g(){for(let S=1;S<=e;S++)for(let E=1;E<=i;E++){let x=(i+1)*(S-1)+(E-1),T=(i+1)*S+(E-1),C=(i+1)*S+E,w=(i+1)*(S-1)+E;f.push(x,T,w),f.push(T,C,w)}}function p(){for(let S=0;S<=e;S++)for(let E=0;E<=i;E++)l.x=S/e,l.y=E/i,u.push(l.x,l.y)}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){let t=super.toJSON();return t.path=this.parameters.path.toJSON(),t}static fromJSON(t){return new to(new fa[t.path.type]().fromJSON(t.path),t.tubularSegments,t.radius,t.radialSegments,t.closed)}}class Ec extends Wt{constructor(t=null){super();if(this.type="WireframeGeometry",this.parameters={geometry:t},t!==null){let e=[],n=new Set,i=new R,s=new R;if(t.index!==null){let r=t.attributes.position,{index:a,groups:o}=t;if(o.length===0)o=[{start:0,count:a.count,materialIndex:0}];for(let l=0,c=o.length;l<c;++l){let h=o[l],{start:d,count:u}=h;for(let f=d,m=d+u;f<m;f+=3)for(let _=0;_<3;_++){let g=a.getX(f+_),p=a.getX(f+(_+1)%3);if(i.fromBufferAttribute(r,g),s.fromBufferAttribute(r,p),fu(i,s,n)===!0)e.push(i.x,i.y,i.z),e.push(s.x,s.y,s.z)}}}else{let r=t.attributes.position;for(let a=0,o=r.count/3;a<o;a++)for(let l=0;l<3;l++){let c=3*a+l,h=3*a+(l+1)%3;if(i.fromBufferAttribute(r,c),s.fromBufferAttribute(r,h),fu(i,s,n)===!0)e.push(i.x,i.y,i.z),e.push(s.x,s.y,s.z)}}this.setAttribute("position",new Tt(e,3))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}}function fu(t,e,n){let i=`${t.x},${t.y},${t.z}-${e.x},${e.y},${e.z}`,s=`${e.x},${e.y},${e.z}-${t.x},${t.y},${t.z}`;if(n.has(i)===!0||n.has(s)===!0)return!1;else return n.add(i),n.add(s),!0}var pu=Object.freeze({__proto__:null,BoxGeometry:Di,CapsuleGeometry:Ba,CircleGeometry:za,ConeGeometry:or,CylinderGeometry:ar,DodecahedronGeometry:Ga,EdgesGeometry:xc,ExtrudeGeometry:qa,IcosahedronGeometry:Ya,LatheGeometry:Za,OctahedronGeometry:cr,PlaneGeometry:Ms,PolyhedronGeometry:ai,RingGeometry:Ja,ShapeGeometry:$a,SphereGeometry:hr,TetrahedronGeometry:Ka,TorusGeometry:Qa,TorusKnotGeometry:ja,TubeGeometry:to,WireframeGeometry:Ec});class Ac extends Ue{constructor(t){super();this.isShadowMaterial=!0,this.type="ShadowMaterial",this.color=new _t(0),this.transparent=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.fog=t.fog,this}}function Fi(t){let e={};for(let n in t){e[n]={};for(let i in t[n]){let s=t[n][i];if(mu(s))if(s.isRenderTargetTexture)dt("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[n][i]=null;else e[n][i]=s.clone();else if(Array.isArray(s))if(mu(s[0])){let r=[];for(let a=0,o=s.length;a<o;a++)r[a]=s[a].clone();e[n][i]=r}else e[n][i]=s.slice();else e[n][i]=s}}return e}function Ve(t){let e={};for(let n=0;n<t.length;n++){let i=Fi(t[n]);for(let s in i)e[s]=i[s]}return e}function mu(t){return t&&(t.isColor||t.isMatrix3||t.isMatrix4||t.isVector2||t.isVector3||t.isVector4||t.isTexture||t.isQuaternion)}function U_(t){let e=[];for(let n=0;n<t.length;n++)e.push(t[n].clone());return e}function wc(t){let e=t.getRenderTarget();if(e===null)return t.outputColorSpace;if(e.isXRRenderTarget===!0)return e.texture.colorSpace;return ne.workingColorSpace}var ur={clone:Fi,merge:Ve},D_=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,F_=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class De extends Ue{constructor(t){super();if(this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=D_,this.fragmentShader=F_,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0)this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=Fi(t.uniforms),this.uniformsGroups=U_(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this.defaultAttributeValues=Object.assign({},t.defaultAttributeValues),this.index0AttributeName=t.index0AttributeName,this.uniformsNeedUpdate=t.uniformsNeedUpdate,this}toJSON(t){let e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(let i in this.uniforms){let r=this.uniforms[i].value;if(r&&r.isTexture)e.uniforms[i]={type:"t",value:r.toJSON(t).uuid};else if(r&&r.isColor)e.uniforms[i]={type:"c",value:r.getHex()};else if(r&&r.isVector2)e.uniforms[i]={type:"v2",value:r.toArray()};else if(r&&r.isVector3)e.uniforms[i]={type:"v3",value:r.toArray()};else if(r&&r.isVector4)e.uniforms[i]={type:"v4",value:r.toArray()};else if(r&&r.isMatrix3)e.uniforms[i]={type:"m3",value:r.toArray()};else if(r&&r.isMatrix4)e.uniforms[i]={type:"m4",value:r.toArray()};else e.uniforms[i]={value:r}}if(Object.keys(this.defines).length>0)e.defines=this.defines;e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;let n={};for(let i in this.extensions)if(this.extensions[i]===!0)n[i]=!0;if(Object.keys(n).length>0)e.extensions=n;return e}fromJSON(t,e){if(super.fromJSON(t,e),t.uniforms!==void 0)for(let n in t.uniforms){let i=t.uniforms[n];switch(this.uniforms[n]={},i.type){case"t":this.uniforms[n].value=e[i.value]||null;break;case"c":this.uniforms[n].value=new _t().setHex(i.value);break;case"v2":this.uniforms[n].value=new j().fromArray(i.value);break;case"v3":this.uniforms[n].value=new R().fromArray(i.value);break;case"v4":this.uniforms[n].value=new de().fromArray(i.value);break;case"m3":this.uniforms[n].value=new Xt().fromArray(i.value);break;case"m4":this.uniforms[n].value=new Vt().fromArray(i.value);break;default:this.uniforms[n].value=i.value}}if(t.defines!==void 0)this.defines=t.defines;if(t.vertexShader!==void 0)this.vertexShader=t.vertexShader;if(t.fragmentShader!==void 0)this.fragmentShader=t.fragmentShader;if(t.glslVersion!==void 0)this.glslVersion=t.glslVersion;if(t.extensions!==void 0)for(let n in t.extensions)this.extensions[n]=t.extensions[n];if(t.lights!==void 0)this.lights=t.lights;if(t.clipping!==void 0)this.clipping=t.clipping;return this}}class eo extends De{constructor(t){super(t);this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class no extends Ue{constructor(t){super();this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new _t(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new _t(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new j(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new mn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}}class Cc extends no{constructor(t){super();this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new j(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return Ht(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(e){this.ior=(1+0.4*e)/(1-0.4*e)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new _t(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new _t(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new _t(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._retroreflectivity=0,this._sheen=0,this._transmission=0,this.setValues(t)}get anisotropy(){return this._anisotropy}set anisotropy(t){if(this._anisotropy>0!==t>0)this.version++;this._anisotropy=t}get clearcoat(){return this._clearcoat}set clearcoat(t){if(this._clearcoat>0!==t>0)this.version++;this._clearcoat=t}get iridescence(){return this._iridescence}set iridescence(t){if(this._iridescence>0!==t>0)this.version++;this._iridescence=t}get dispersion(){return this._dispersion}set dispersion(t){if(this._dispersion>0!==t>0)this.version++;this._dispersion=t}get retroreflectivity(){return this._retroreflectivity}set retroreflectivity(t){if(this._retroreflectivity>0!==t>0)this.version++;this._retroreflectivity=t}get sheen(){return this._sheen}set sheen(t){if(this._sheen>0!==t>0)this.version++;this._sheen=t}get transmission(){return this._transmission}set transmission(t){if(this._transmission>0!==t>0)this.version++;this._transmission=t}copy(t){return super.copy(t),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=t.anisotropy,this.anisotropyRotation=t.anisotropyRotation,this.anisotropyMap=t.anisotropyMap,this.clearcoat=t.clearcoat,this.clearcoatMap=t.clearcoatMap,this.clearcoatRoughness=t.clearcoatRoughness,this.clearcoatRoughnessMap=t.clearcoatRoughnessMap,this.clearcoatNormalMap=t.clearcoatNormalMap,this.clearcoatNormalScale.copy(t.clearcoatNormalScale),this.dispersion=t.dispersion,this.ior=t.ior,this.iridescence=t.iridescence,this.iridescenceMap=t.iridescenceMap,this.iridescenceIOR=t.iridescenceIOR,this.iridescenceThicknessRange=[...t.iridescenceThicknessRange],this.iridescenceThicknessMap=t.iridescenceThicknessMap,this.retroreflectivity=t.retroreflectivity,this.sheen=t.sheen,this.sheenColor.copy(t.sheenColor),this.sheenColorMap=t.sheenColorMap,this.sheenRoughness=t.sheenRoughness,this.sheenRoughnessMap=t.sheenRoughnessMap,this.transmission=t.transmission,this.transmissionMap=t.transmissionMap,this.thickness=t.thickness,this.thicknessMap=t.thicknessMap,this.attenuationDistance=t.attenuationDistance,this.attenuationColor.copy(t.attenuationColor),this.specularIntensity=t.specularIntensity,this.specularIntensityMap=t.specularIntensityMap,this.specularColor.copy(t.specularColor),this.specularColorMap=t.specularColorMap,this}}class Rc extends Ue{constructor(t){super();this.isMeshPhongMaterial=!0,this.type="MeshPhongMaterial",this.color=new _t(16777215),this.specular=new _t(1118481),this.shininess=30,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new _t(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new j(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new mn,this.combine=0,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=0.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.specular.copy(t.specular),this.shininess=t.shininess,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.envMapIntensity=t.envMapIntensity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}}class Ic extends Ue{constructor(t){super();this.isMeshToonMaterial=!0,this.defines={TOON:""},this.type="MeshToonMaterial",this.color=new _t(16777215),this.map=null,this.gradientMap=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new _t(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new j(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.alphaMap=null,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.gradientMap=t.gradientMap,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.alphaMap=t.alphaMap,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}}class Pc extends Ue{constructor(t){super();this.isMeshNormalMaterial=!0,this.type="MeshNormalMaterial",this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new j(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.flatShading=!1,this.setValues(t)}copy(t){return super.copy(t),this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.flatShading=t.flatShading,this}}class Lc extends Ue{constructor(t){super();this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new _t(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new _t(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new j(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new mn,this.combine=0,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=0.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.envMapIntensity=t.envMapIntensity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}}class io extends Ue{constructor(t){super();this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=3200,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}}class so extends Ue{constructor(t){super();this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}}class Nc extends Ue{constructor(t){super();this.isMeshMatcapMaterial=!0,this.defines={MATCAP:""},this.type="MeshMatcapMaterial",this.color=new _t(16777215),this.matcap=null,this.map=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new j(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.alphaMap=null,this.wireframe=!1,this.wireframeLinewidth=1,this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={MATCAP:""},this.color.copy(t.color),this.matcap=t.matcap,this.map=t.map,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.alphaMap=t.alphaMap,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.flatShading=t.flatShading,this.fog=t.fog,this}}class Uc extends He{constructor(t){super();this.isLineDashedMaterial=!0,this.type="LineDashedMaterial",this.scale=1,this.dashSize=3,this.gapSize=1,this.setValues(t)}copy(t){return super.copy(t),this.scale=t.scale,this.dashSize=t.dashSize,this.gapSize=t.gapSize,this}}function fn(t,e){if(!t||t.constructor===e)return t;if(typeof e.BYTES_PER_ELEMENT==="number")return new e(t);return Array.prototype.slice.call(t)}function Ws(t){return t!==void 0&&t.inTangents!==void 0&&t.outTangents!==void 0}function mf(t){function e(s,r){return t[s]-t[r]}let n=t.length,i=Array(n);for(let s=0;s!==n;++s)i[s]=s;return i.sort(e),i}function al(t,e,n){let i=t.length,s=new t.constructor(i);for(let r=0,a=0;a!==i;++r){let o=n[r]*e;for(let l=0;l!==e;++l)s[a++]=t[o+l]}return s}function gf(t,e,n,i){let s=1,r=t[0];while(r!==void 0&&r[i]===void 0)r=t[s++];if(r===void 0)return;let a=r[i];if(a===void 0)return;if(Array.isArray(a))do{if(a=r[i],a!==void 0)e.push(r.time),n.push(...a);r=t[s++]}while(r!==void 0);else if(a.toArray!==void 0)do{if(a=r[i],a!==void 0)e.push(r.time),a.toArray(n,n.length);r=t[s++]}while(r!==void 0);else do{if(a=r[i],a!==void 0)e.push(r.time),n.push(a);r=t[s++]}while(r!==void 0)}function O_(t,e,n,i,s=30){let r=t.clone();r.name=e;let a=[];for(let l=0;l<r.tracks.length;++l){let c=r.tracks[l],h=c.getValueSize(),d=[],u=[];for(let f=0;f<c.times.length;++f){let m=c.times[f]*s;if(m<n||m>=i)continue;d.push(c.times[f]);for(let _=0;_<h;++_)u.push(c.values[f*h+_])}if(d.length===0)continue;c.times=fn(d,c.times.constructor),c.values=fn(u,c.values.constructor),a.push(c)}r.tracks=a;let o=1/0;for(let l=0;l<r.tracks.length;++l)if(o>r.tracks[l].times[0])o=r.tracks[l].times[0];for(let l=0;l<r.tracks.length;++l)r.tracks[l].shift(-1*o);return r.resetDuration(),r}function B_(t,e=0,n=t,i=30){if(i<=0)i=30;let s=n.tracks.length,r=e/i;for(let a=0;a<s;++a){let o=n.tracks[a],l=o.ValueTypeName;if(l==="bool"||l==="string")continue;let c=t.tracks.find(function(p){return p.name===o.name&&p.ValueTypeName===l});if(c===void 0)continue;let h=0,d=o.getValueSize();if(o.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline)h=d/3;let u=0,f=c.getValueSize();if(c.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline)u=f/3;let m=o.times.length-1,_;if(r<=o.times[0]){let p=h,S=d-h;_=o.values.slice(p,S)}else if(r>=o.times[m]){let p=m*d+h,S=p+d-h;_=o.values.slice(p,S)}else{let p=o.createInterpolant(),S=h,E=d-h;p.evaluate(r),_=p.resultBuffer.slice(S,E)}if(l==="quaternion")new ke().fromArray(_).normalize().conjugate().toArray(_);let g=c.times.length;for(let p=0;p<g;++p){let S=p*f+u;if(l==="quaternion")ke.multiplyQuaternionsFlat(c.values,S,_,0,c.values,S);else{let E=f-u*2;for(let x=0;x<E;++x)c.values[S+x]-=_[x]}}}return t.blendMode=2501,t}class _f{static convertArray(t,e){return fn(t,e)}static isTypedArray(t){return zd(t)}static hasTangents(t){return Ws(t)}static getKeyframeOrder(t){return mf(t)}static sortedArray(t,e,n){return al(t,e,n)}static flattenJSON(t,e,n,i){gf(t,e,n,i)}static subclip(t,e,n,i,s=30){return O_(t,e,n,i,s)}static makeClipAdditive(t,e=0,n=t,i=30){return B_(t,e,n,i)}}class Oi{constructor(t,e,n,i){this.parameterPositions=t,this._cachedIndex=0,this.resultBuffer=i!==void 0?i:new e.constructor(n),this.sampleValues=e,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(t){let e=this.parameterPositions,n=this._cachedIndex,i=e[n],s=e[n-1];t:{e:{let r;n:{i:if(!(t<i)){for(let a=n+2;;){if(i===void 0){if(t<s)break i;return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(s=i,i=e[++n],t<i)break e}r=e.length;break n}if(!(t>=s)){let a=e[1];if(t<a)n=2,s=a;for(let o=n-2;;){if(s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===o)break;if(i=s,s=e[--n-1],t>=s)break e}r=n,n=0;break n}break t}while(n<r){let a=n+r>>>1;if(t<e[a])r=a;else n=a+1}if(i=e[n],s=e[n-1],s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===void 0)return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,s,i)}return this.interpolate_(n,s,t,i)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(t){let e=this.resultBuffer,n=this.sampleValues,i=this.valueSize,s=t*i;for(let r=0;r!==i;++r)e[r]=n[s+r];return e}interpolate_(){throw Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}}class Dc extends Oi{constructor(t,e,n,i){super(t,e,n,i);this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:2400,endingEnd:2400}}intervalChanged_(t,e,n){let i=this.parameterPositions,s=t-2,r=t+1,a=i[s],o=i[r];if(a===void 0)switch(this.getSettings_().endingStart){case 2401:s=t,a=2*e-n;break;case 2402:s=i.length-2,a=e+i[s]-i[s+1];break;default:s=t,a=n}if(o===void 0)switch(this.getSettings_().endingEnd){case 2401:r=t,o=2*n-e;break;case 2402:r=1,o=n+i[1]-i[0];break;default:r=t-1,o=e}let l=(n-e)*0.5,c=this.valueSize;this._weightPrev=l/(e-a),this._weightNext=l/(o-n),this._offsetPrev=s*c,this._offsetNext=r*c}interpolate_(t,e,n,i){let s=this.resultBuffer,r=this.sampleValues,a=this.valueSize,o=t*a,l=o-a,c=this._offsetPrev,h=this._offsetNext,d=this._weightPrev,u=this._weightNext,f=(n-e)/(i-e),m=f*f,_=m*f,g=-d*_+2*d*m-d*f,p=(1+d)*_+(-1.5-2*d)*m+(-0.5+d)*f+1,S=(-1-u)*_+(1.5+u)*m+0.5*f,E=u*_-u*m;for(let x=0;x!==a;++x)s[x]=g*r[c+x]+p*r[l+x]+S*r[o+x]+E*r[h+x];return s}}class ro extends Oi{constructor(t,e,n,i){super(t,e,n,i)}interpolate_(t,e,n,i){let s=this.resultBuffer,r=this.sampleValues,a=this.valueSize,o=t*a,l=o-a,c=(n-e)/(i-e),h=1-c;for(let d=0;d!==a;++d)s[d]=r[l+d]*h+r[o+d]*c;return s}}class Fc extends Oi{constructor(t,e,n,i){super(t,e,n,i)}interpolate_(t){return this.copySampleValue_(t-1)}}class Oc extends Oi{interpolate_(t,e,n,i){let s=this.resultBuffer,r=this.sampleValues,a=this.valueSize,o=t*a,l=o-a,c=this.inTangents,h=this.outTangents;if(!c||!h){let f=(n-e)/(i-e),m=1-f;for(let _=0;_!==a;++_)s[_]=r[l+_]*m+r[o+_]*f;return s}let d=a*2,u=t-1;for(let f=0;f!==a;++f){let m=r[l+f],_=r[o+f],g=u*d+f*2,p=h[g],S=h[g+1],E=t*d+f*2,x=c[E],T=c[E+1],C=G_(n,e,p,x,i);s[f]=xf(C,m,S,T,_)}return s}}function xf(t,e,n,i,s){let r=1-t;return r*r*r*e+3*r*r*t*n+3*r*t*t*i+t*t*t*s}function z_(t,e,n,i,s){let r=1-t;return 3*r*r*(n-e)+6*r*t*(i-n)+3*t*t*(s-i)}function G_(t,e,n,i,s){let r=(t-e)/(s-e);for(let a=0;a<8;a++){let o=xf(r,e,n,i,s)-t;if(Math.abs(o)<0.0000000001)break;let l=z_(r,e,n,i,s);if(Math.abs(l)<0.0000000001)break;r=Math.max(0,Math.min(1,r-o/l))}return r}class rn{constructor(t,e,n,i){if(t===void 0)throw Error("THREE.KeyframeTrack: track name is undefined");if(e===void 0||e.length===0)throw Error("THREE.KeyframeTrack: no keyframes in track named "+t);this.name=t,this.times=fn(e,this.TimeBufferType),this.values=fn(n,this.ValueBufferType),this.setInterpolation(i||this.DefaultInterpolation)}static toJSON(t){let e=t.constructor,n;if(e.toJSON!==this.toJSON)n=e.toJSON(t);else{n={name:t.name,times:fn(t.times,Array),values:fn(t.values,Array)};let i=t.getInterpolation();if(i!==t.DefaultInterpolation)n.interpolation=i;if(Ws(t.settings))n.settings={inTangents:fn(t.settings.inTangents,Array),outTangents:fn(t.settings.outTangents,Array)}}return n.type=t.ValueTypeName,n}InterpolantFactoryMethodDiscrete(t){return new Fc(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodLinear(t){return new ro(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodSmooth(t){return new Dc(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodBezier(t){let e=new Oc(this.times,this.values,this.getValueSize(),t);if(this.settings)e.inTangents=this.settings.inTangents,e.outTangents=this.settings.outTangents;return e}setInterpolation(t){let e;switch(t){case 2300:e=this.InterpolantFactoryMethodDiscrete;break;case 2301:e=this.InterpolantFactoryMethodLinear;break;case 2302:e=this.InterpolantFactoryMethodSmooth;break;case 2303:e=this.InterpolantFactoryMethodBezier;break}if(e===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(t!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw Error(n);return dt("KeyframeTrack:",n),this}return this.createInterpolant=e,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return 2300;case this.InterpolantFactoryMethodLinear:return 2301;case this.InterpolantFactoryMethodSmooth:return 2302;case this.InterpolantFactoryMethodBezier:return 2303}}getValueSize(){return this.values.length/this.times.length}shift(t){if(t!==0){let e=this.times;for(let n=0,i=e.length;n!==i;++n)e[n]+=t}return this}scale(t){if(t!==1){let e=this.times;for(let n=0,i=e.length;n!==i;++n)e[n]*=t;if(Ws(this.settings))gu(this.settings.inTangents,t),gu(this.settings.outTangents,t)}return this}trim(t,e){let n=this.times,i=n.length,s=0,r=i-1;while(s!==i&&n[s]<t)++s;while(r!==-1&&n[r]>e)--r;if(++r,s!==0||r!==i){if(s>=r)r=Math.max(r,1),s=r-1;let a=this.getValueSize();this.times=n.slice(s,r),this.values=this.values.slice(s*a,r*a)}return this}validate(){let t=!0,e=this.getValueSize();if(e-Math.floor(e)!==0)Lt("KeyframeTrack: Invalid value size in track.",this),t=!1;let n=this.times,i=this.values,s=n.length;if(s===0)Lt("KeyframeTrack: Track is empty.",this),t=!1;let r=null;for(let a=0;a!==s;a++){let o=n[a];if(typeof o==="number"&&isNaN(o)){Lt("KeyframeTrack: Time is not a valid number.",this,a,o),t=!1;break}if(r!==null&&r>o){Lt("KeyframeTrack: Out of order keys.",this,a,o,r),t=!1;break}r=o}if(i!==void 0){if(zd(i))for(let a=0,o=i.length;a!==o;++a){let l=i[a];if(isNaN(l)){Lt("KeyframeTrack: Value is not a valid number.",this,a,l),t=!1;break}}}return t}optimize(){let t=this.times.slice(),e=this.values.slice(),n=this.getValueSize(),i=this.getInterpolation()===2302,s=t.length-1,r=1;for(let a=1;a<s;++a){let o=!1,l=t[a],c=t[a+1];if(l!==c&&(a!==1||l!==t[0]))if(!i){let h=a*n,d=h-n,u=h+n;for(let f=0;f!==n;++f){let m=e[h+f];if(m!==e[d+f]||m!==e[u+f]){o=!0;break}}}else o=!0;if(o){if(a!==r){t[r]=t[a];let h=a*n,d=r*n;for(let u=0;u!==n;++u)e[d+u]=e[h+u]}++r}}if(s>0){t[r]=t[s];for(let a=s*n,o=r*n,l=0;l!==n;++l)e[o+l]=e[a+l];++r}if(r!==t.length)this.times=t.slice(0,r),this.values=e.slice(0,r*n);else this.times=t,this.values=e;return this}clone(){let t=this.times.slice(),e=this.values.slice(),i=new this.constructor(this.name,t,e);if(i.createInterpolant=this.createInterpolant,Ws(this.settings))i.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()};return i}}function gu(t,e){for(let n=0,i=t.length;n!==i;n+=2)t[n]*=e}rn.prototype.ValueTypeName="";rn.prototype.TimeBufferType=Float32Array;rn.prototype.ValueBufferType=Float32Array;rn.prototype.DefaultInterpolation=2301;class oi extends rn{constructor(t,e,n){super(t,e,n)}}oi.prototype.ValueTypeName="bool";oi.prototype.ValueBufferType=Array;oi.prototype.DefaultInterpolation=2300;oi.prototype.InterpolantFactoryMethodLinear=void 0;oi.prototype.InterpolantFactoryMethodSmooth=void 0;class ao extends rn{constructor(t,e,n,i){super(t,e,n,i)}}ao.prototype.ValueTypeName="color";class dr extends rn{constructor(t,e,n,i){super(t,e,n,i)}}dr.prototype.ValueTypeName="number";class Bc extends Oi{constructor(t,e,n,i){super(t,e,n,i)}interpolate_(t,e,n,i){let s=this.resultBuffer,r=this.sampleValues,a=this.valueSize,o=(n-e)/(i-e),l=t*a;for(let c=l+a;l!==c;l+=4)ke.slerpFlat(s,0,r,l-a,r,l,o);return s}}class fr extends rn{constructor(t,e,n,i){super(t,e,n,i)}InterpolantFactoryMethodLinear(t){return new Bc(this.times,this.values,this.getValueSize(),t)}}fr.prototype.ValueTypeName="quaternion";fr.prototype.InterpolantFactoryMethodSmooth=void 0;class li extends rn{constructor(t,e,n){super(t,e,n)}}li.prototype.ValueTypeName="string";li.prototype.ValueBufferType=Array;li.prototype.DefaultInterpolation=2300;li.prototype.InterpolantFactoryMethodLinear=void 0;li.prototype.InterpolantFactoryMethodSmooth=void 0;class oo extends rn{constructor(t,e,n,i){super(t,e,n,i)}}oo.prototype.ValueTypeName="vector";class ds{constructor(t="",e=-1,n=[],i=2500){if(this.name=t,this.tracks=n,this.duration=e,this.blendMode=i,this.uuid=nn(),this.userData={},this.duration<0)this.resetDuration()}static parse(t){let e=[],n=t.tracks,i=1/(t.fps||1);for(let r=0,a=n.length;r!==a;++r)e.push(H_(n[r]).scale(i));let s=new this(t.name,t.duration,e,t.blendMode);return s.uuid=t.uuid,s.userData=JSON.parse(t.userData||"{}"),s}static toJSON(t){let e=[],n=t.tracks,i={name:t.name,duration:t.duration,tracks:e,uuid:t.uuid,blendMode:t.blendMode,userData:JSON.stringify(t.userData)};for(let s=0,r=n.length;s!==r;++s)e.push(rn.toJSON(n[s]));return i}static CreateFromMorphTargetSequence(t,e,n,i){let s=e.length,r=[];for(let a=0;a<s;a++){let o=[],l=[];o.push((a+s-1)%s,a,(a+1)%s),l.push(0,1,0);let c=mf(o);if(o=al(o,1,c),l=al(l,1,c),!i&&o[0]===0)o.push(s),l.push(l[0]);r.push(new dr(".morphTargetInfluences["+e[a].name+"]",o,l).scale(1/n))}return new this(t,-1,r)}static findByName(t,e){let n=t;if(!Array.isArray(t)){let i=t;n=i.geometry&&i.geometry.animations||i.animations}for(let i=0;i<n.length;i++)if(n[i].name===e)return n[i];return null}static CreateClipsFromMorphTargetSequences(t,e,n){let i={},s=/^([\w-]*?)([\d]+)$/;for(let a=0,o=t.length;a<o;a++){let l=t[a],c=l.name.match(s);if(c&&c.length>1){let h=c[1],d=i[h];if(!d)i[h]=d=[];d.push(l)}}let r=[];for(let a in i)r.push(this.CreateFromMorphTargetSequence(a,i[a],e,n));return r}resetDuration(){let t=this.tracks,e=0;for(let n=0,i=t.length;n!==i;++n){let s=this.tracks[n];e=Math.max(e,s.times[s.times.length-1])}return this.duration=e,this}trim(){for(let t=0;t<this.tracks.length;t++)this.tracks[t].trim(0,this.duration);return this}validate(){let t=!0;for(let e=0;e<this.tracks.length;e++)t=t&&this.tracks[e].validate();return t}optimize(){for(let t=0;t<this.tracks.length;t++)this.tracks[t].optimize();return this}clone(){let t=[];for(let n=0;n<this.tracks.length;n++)t.push(this.tracks[n].clone());let e=new this.constructor(this.name,this.duration,t,this.blendMode);return e.userData=JSON.parse(JSON.stringify(this.userData)),e}toJSON(){return this.constructor.toJSON(this)}}function k_(t){switch(t.toLowerCase()){case"scalar":case"double":case"float":case"number":case"integer":return dr;case"vector":case"vector2":case"vector3":case"vector4":return oo;case"color":return ao;case"quaternion":return fr;case"bool":case"boolean":return oi;case"string":return li}throw Error("THREE.KeyframeTrack: Unsupported typeName: "+t)}function H_(t){if(t.type===void 0)throw Error("THREE.KeyframeTrack: track type undefined, can not parse");let e=k_(t.type);if(t.times===void 0){let i=[],s=[];gf(t.keys,i,s,"value"),t.times=i,t.values=s}let n;if(e.parse!==void 0)n=e.parse(t);else n=new e(t.name,t.times,t.values,t.interpolation);if(Ws(t.settings))n.settings={inTangents:fn(t.settings.inTangents,Float32Array),outTangents:fn(t.settings.outTangents,Float32Array)};return n}var En={enabled:!1,files:{},add:function(t,e){if(this.enabled===!1)return;if(_u(t))return;this.files[t]=e},get:function(t){if(this.enabled===!1)return;if(_u(t))return;return this.files[t]},remove:function(t){delete this.files[t]},clear:function(){this.files={}}};function _u(t){try{let e=t.slice(t.indexOf(":")+1);return new URL(e).protocol==="blob:"}catch(e){return!1}}class lo{constructor(t,e,n){let i=this,s=!1,r=0,a=0,o=void 0,l=[];this.onStart=void 0,this.onLoad=t,this.onProgress=e,this.onError=n,this._abortController=null,this.itemStart=function(c){if(a++,s===!1){if(i.onStart!==void 0)i.onStart(c,r,a)}s=!0},this.itemEnd=function(c){if(r++,i.onProgress!==void 0)i.onProgress(c,r,a);if(r===a){if(s=!1,i.onLoad!==void 0)i.onLoad()}},this.itemError=function(c){if(i.onError!==void 0)i.onError(c)},this.resolveURL=function(c){if(c=c.normalize("NFC"),o)return o(c);return c},this.setURLModifier=function(c){return o=c,this},this.addHandler=function(c,h){return l.push(c,h),this},this.removeHandler=function(c){let h=l.indexOf(c);if(h!==-1)l.splice(h,2);return this},this.getHandler=function(c){for(let h=0,d=l.length;h<d;h+=2){let u=l[h],f=l[h+1];if(u.global)u.lastIndex=0;if(u.test(c))return f}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){if(!this._abortController)this._abortController=new AbortController;return this._abortController}}var vf=new lo;class Ye{constructor(t){if(this.manager=t!==void 0?t:vf,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(t,e){let n=this;return new Promise(function(i,s){n.load(t,i,e,s)})}parse(){}setCrossOrigin(t){return this.crossOrigin=t,this}setWithCredentials(t){return this.withCredentials=t,this}setPath(t){return this.path=t,this}setResourcePath(t){return this.resourcePath=t,this}setRequestHeader(t){return this.requestHeader=t,this}abort(){return this}}Ye.DEFAULT_MATERIAL_NAME="__DEFAULT";var Bn={};class yf extends Error{constructor(t,e){super(t);this.response=e}}class An extends Ye{constructor(t){super(t);this.mimeType="",this.responseType="",this._abortController=new AbortController}load(t,e,n,i){if(t===void 0)t="";if(this.path!==void 0)t=this.path+t;t=this.manager.resolveURL(t);let s=En.get(`file:${t}`);if(s!==void 0){this.manager.itemStart(t),setTimeout(()=>{if(e)e(s);this.manager.itemEnd(t)},0);return}if(Bn[t]!==void 0){Bn[t].push({onLoad:e,onProgress:n,onError:i});return}Bn[t]=[],Bn[t].push({onLoad:e,onProgress:n,onError:i});let r=new Request(t,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",signal:typeof AbortSignal.any==="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),a=this.mimeType,o=this.responseType;fetch(r).then((l)=>{if(l.status===200||l.status===0){if(l.status===0)dt("FileLoader: HTTP Status 0 received.");if(typeof ReadableStream>"u"||l.body===void 0||l.body.getReader===void 0)return l;let c=Bn[t],h=l.body.getReader(),d=l.headers.get("X-File-Size")||l.headers.get("Content-Length"),u=d?parseInt(d):0,f=u!==0,m=0,_=new ReadableStream({start(g){p();function p(){h.read().then(({done:S,value:E})=>{if(S)g.close();else{m+=E.byteLength;let x=new ProgressEvent("progress",{lengthComputable:f,loaded:m,total:u});for(let T=0,C=c.length;T<C;T++){let w=c[T];if(w.onProgress)w.onProgress(x)}g.enqueue(E),p()}},(S)=>{g.error(S)})}}});return new Response(_)}else throw new yf(`fetch for "${l.url}" responded with ${l.status}: ${l.statusText}`,l)}).then((l)=>{switch(o){case"arraybuffer":return l.arrayBuffer();case"blob":return l.blob();case"document":return l.text().then((c)=>new DOMParser().parseFromString(c,a));case"json":return l.json();default:if(a==="")return l.text();else{let h=/charset="?([^;"\s]*)"?/i.exec(a),d=h&&h[1]?h[1].toLowerCase():void 0,u=new TextDecoder(d);return l.arrayBuffer().then((f)=>u.decode(f))}}}).then((l)=>{En.add(`file:${t}`,l);let c=Bn[t];delete Bn[t];for(let h=0,d=c.length;h<d;h++){let u=c[h];if(u.onLoad)u.onLoad(l)}}).catch((l)=>{let c=Bn[t];if(c===void 0)throw this.manager.itemError(t),l;delete Bn[t];for(let h=0,d=c.length;h<d;h++){let u=c[h];if(u.onError)u.onError(l)}this.manager.itemError(t)}).finally(()=>{this.manager.itemEnd(t)}),this.manager.itemStart(t)}setResponseType(t){return this.responseType=t,this}setMimeType(t){return this.mimeType=t,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}class Sf extends Ye{constructor(t){super(t)}load(t,e,n,i){let s=this,r=new An(this.manager);r.setPath(this.path),r.setRequestHeader(this.requestHeader),r.setWithCredentials(this.withCredentials),r.load(t,function(a){try{e(s.parse(JSON.parse(a)))}catch(o){if(i)i(o);else Lt(o);s.manager.itemError(t)}},n,i)}parse(t){let e=[];for(let n=0;n<t.length;n++){let i=ds.parse(t[n]);e.push(i)}return e}}class Mf extends Ye{constructor(t){super(t)}load(t,e,n,i){let s=this,r=[],a=new rr,o=new An(this.manager);o.setPath(this.path),o.setResponseType("arraybuffer"),o.setRequestHeader(this.requestHeader),o.setWithCredentials(s.withCredentials);let l=0;function c(h){o.load(t[h],function(d){let u=s.parse(d,!0);if(r[h]={width:u.width,height:u.height,format:u.format,mipmaps:u.mipmaps},l+=1,l===6){if(u.mipmapCount===1)a.minFilter=1006;if(a.image=r,a.format=u.format,a.needsUpdate=!0,e)e(a)}},n,i)}if(Array.isArray(t))for(let h=0,d=t.length;h<d;++h)c(h);else o.load(t,function(h){let d=s.parse(h,!0);if(d.isCubemap){let u=d.mipmaps.length/d.mipmapCount;for(let f=0;f<u;f++){r[f]={mipmaps:[]};for(let m=0;m<d.mipmapCount;m++)r[f].mipmaps.push(d.mipmaps[f*d.mipmapCount+m]),r[f].format=d.format,r[f].width=d.width,r[f].height=d.height}a.image=r}else a.image.width=d.width,a.image.height=d.height,a.mipmaps=d.mipmaps;if(d.mipmapCount===1)a.minFilter=1006;if(a.format=d.format,a.needsUpdate=!0,e)e(a)},n,i);return a}}var ns=new WeakMap;class fs extends Ye{constructor(t){super(t)}load(t,e,n,i){if(this.path!==void 0)t=this.path+t;t=this.manager.resolveURL(t);let s=this,r=En.get(`image:${t}`);if(r!==void 0){if(r.complete===!0)s.manager.itemStart(t),setTimeout(function(){if(e)e(r);s.manager.itemEnd(t)},0);else{let h=ns.get(r);if(h===void 0)h=[],ns.set(r,h);h.push({onLoad:e,onError:i})}return r}let a=cs("img");function o(){if(c(),e)e(this);let h=ns.get(this)||[];for(let d=0;d<h.length;d++){let u=h[d];if(u.onLoad)u.onLoad(this)}ns.delete(this),s.manager.itemEnd(t)}function l(h){if(c(),i)i(h);En.remove(`image:${t}`);let d=ns.get(this)||[];for(let u=0;u<d.length;u++){let f=d[u];if(f.onError)f.onError(h)}ns.delete(this),s.manager.itemError(t),s.manager.itemEnd(t)}function c(){a.removeEventListener("load",o,!1),a.removeEventListener("error",l,!1)}if(a.addEventListener("load",o,!1),a.addEventListener("error",l,!1),t.slice(0,5)!=="data:"){if(this.crossOrigin!==void 0)a.crossOrigin=this.crossOrigin}return En.add(`image:${t}`,a),s.manager.itemStart(t),a.src=t,a}}class bf extends Ye{constructor(t){super(t)}load(t,e,n,i){let s=new ys;s.colorSpace="srgb";let r=new fs(this.manager);r.setCrossOrigin(this.crossOrigin),r.setPath(this.path);let a=0;function o(l){r.load(t[l],function(c){if(s.images[l]=c,a++,a===6){if(s.needsUpdate=!0,e)e(s)}},void 0,i)}for(let l=0;l<t.length;++l)o(l);return s}}class Tf extends Ye{constructor(t){super(t)}load(t,e,n,i){let s=this,r=new sn,a=new An(this.manager);return a.setResponseType("arraybuffer"),a.setRequestHeader(this.requestHeader),a.setPath(this.path),a.setWithCredentials(s.withCredentials),a.load(t,function(o){let l;try{l=s.parse(o)}catch(c){if(i!==void 0)i(c);else Lt(c);return}if(s._applyTexData(r,l),e)e(r,l)},n,i),r}createDataTexture(t){let e=new sn;return this._applyTexData(e,this.parse(t)),e}_applyTexData(t,e){if(e.image!==void 0)t.image=e.image;else if(e.data!==void 0)t.image.width=e.width,t.image.height=e.height,t.image.data=e.data;if(t.wrapS=e.wrapS!==void 0?e.wrapS:1001,t.wrapT=e.wrapT!==void 0?e.wrapT:1001,t.magFilter=e.magFilter!==void 0?e.magFilter:1006,t.minFilter=e.minFilter!==void 0?e.minFilter:1006,t.anisotropy=e.anisotropy!==void 0?e.anisotropy:1,e.colorSpace!==void 0)t.colorSpace=e.colorSpace;if(e.flipY!==void 0)t.flipY=e.flipY;if(e.format!==void 0)t.format=e.format;if(e.type!==void 0)t.type=e.type;if(e.mipmaps!==void 0)t.mipmaps=e.mipmaps,t.minFilter=1008;if(e.mipmapCount===1)t.minFilter=1006;if(e.generateMipmaps!==void 0)t.generateMipmaps=e.generateMipmaps;t.needsUpdate=!0}}class Ef extends Ye{constructor(t){super(t)}load(t,e,n,i){let s=new Se,r=new fs(this.manager);return r.setCrossOrigin(this.crossOrigin),r.setPath(this.path),r.load(t,function(a){if(s.image=a,s.needsUpdate=!0,e!==void 0)e(s)},n,i),s}}class Wn extends re{constructor(t,e=1){super();this.isLight=!0,this.type="Light",this.color=new _t(t),this.intensity=e}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){let e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,e}}class zc extends Wn{constructor(t,e,n){super(t,n);this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(re.DEFAULT_UP),this.updateMatrix(),this.groundColor=new _t(e)}copy(t,e){return super.copy(t,e),this.groundColor.copy(t.groundColor),this}toJSON(t){let e=super.toJSON(t);return e.object.groundColor=this.groundColor.getHex(),e}}var $o=new Vt,xu=new R,vu=new R;class pr{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new j(512,512),this.mapType=1009,this.map=null,this.mapPass=null,this.matrix=new Vt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new ii,this._frameExtents=new j(1,1),this._viewportCount=1,this._viewports=[new de(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(t){let e=this.camera;xu.setFromMatrixPosition(t.matrixWorld),e.position.copy(xu),vu.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(vu),e.updateMatrixWorld(),this._updateMatrix(e,this.matrix,this._frustum)}_updateMatrix(t,e,n,i){$o.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),n.setFromProjectionMatrix($o,t.coordinateSystem,t.reversedDepth);let s=this._frameExtents,r=i?i.z/s.x:1,a=i?i.w/s.y:1,o=i?i.x/s.x:0,l=i?i.y/s.y:0;if(t.coordinateSystem===2001||t.reversedDepth)e.set(0.5*r,0,0,0.5*r+o,0,0.5*a,0,0.5*a+l,0,0,1,0,0,0,0,1);else e.set(0.5*r,0,0,0.5*r+o,0,0.5*a,0,0.5*a+l,0,0,0.5,0.5,0,0,0,1);e.multiply($o)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){if(this.map)this.map.dispose();if(this.mapPass)this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.autoUpdate=t.autoUpdate,this.needsUpdate=t.needsUpdate,this.normalBias=t.normalBias,this.blurSamples=t.blurSamples,this.mapSize.copy(t.mapSize),this.biasNode=t.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let t={};return t.intensity=this.intensity,t.bias=this.bias,t.normalBias=this.normalBias,t.radius=this.radius,t.blurSamples=this.blurSamples,t.mapSize=this.mapSize.toArray(),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}}var na=new R,ia=new ke,Mn=new R;class mr extends re{constructor(){super();this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Vt,this.projectionMatrix=new Vt,this.projectionMatrixInverse=new Vt,this.coordinateSystem=2000,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){if(super.updateMatrixWorld(t),this.matrixWorld.decompose(na,ia,Mn),Mn.x===1&&Mn.y===1&&Mn.z===1)this.matrixWorldInverse.copy(this.matrixWorld).invert();else this.matrixWorldInverse.compose(na,ia,Mn.set(1,1,1)).invert()}updateWorldMatrix(t,e,n=!1){if(super.updateWorldMatrix(t,e,n),this.matrixWorld.decompose(na,ia,Mn),Mn.x===1&&Mn.y===1&&Mn.z===1)this.matrixWorldInverse.copy(this.matrixWorld).invert();else this.matrixWorldInverse.compose(na,ia,Mn.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}var Qn=new R,yu=new j,Su=new j;class Le extends mr{constructor(t=50,e=1,n=0.1,i=2000){super();this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=i,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){let e=0.5*this.getFilmHeight()/t;this.fov=Ei*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){let t=Math.tan(Ti*0.5*this.fov);return 0.5*this.getFilmHeight()/t}getEffectiveFOV(){return Ei*2*Math.atan(Math.tan(Ti*0.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){Qn.set(-1,-1,0.5).applyMatrix4(this.projectionMatrixInverse),e.set(Qn.x,Qn.y).multiplyScalar(-t/Qn.z),Qn.set(1,1,0.5).applyMatrix4(this.projectionMatrixInverse),n.set(Qn.x,Qn.y).multiplyScalar(-t/Qn.z)}getViewSize(t,e){return this.getViewBounds(t,yu,Su),e.subVectors(Su,yu)}setViewOffset(t,e,n,i,s,r){if(this.aspect=t/e,this.view===null)this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1};this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=i,this.view.width=s,this.view.height=r,this.updateProjectionMatrix()}clearViewOffset(){if(this.view!==null)this.view.enabled=!1;this.updateProjectionMatrix()}updateProjectionMatrix(){let t=this.near,e=t*Math.tan(Ti*0.5*this.fov)/this.zoom,n=2*e,i=this.aspect*n,s=-0.5*i,r=this.view;if(this.view!==null&&this.view.enabled){let{fullWidth:o,fullHeight:l}=r;s+=r.offsetX*i/o,e-=r.offsetY*n/l,i*=r.width/o,n*=r.height/l}let a=this.filmOffset;if(a!==0)s+=t*a/this.getFilmWidth();this.projectionMatrix.makePerspective(s,s+i,e,e-n,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);if(e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null)e.object.view=Object.assign({},this.view);return e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}}class Af extends pr{constructor(){super(new Le(50,1,0.5,500));this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(t){let e=this.camera,n=Ei*2*t.angle*this.focus,i=this.mapSize.width/this.mapSize.height*this.aspect,s=t.distance||e.far;if(n!==e.fov||i!==e.aspect||s!==e.far)e.fov=n,e.aspect=i,e.far=s,e.updateProjectionMatrix();super.updateMatrices(t)}copy(t){return super.copy(t),this.focus=t.focus,this.aspect=t.aspect,this}toJSON(){let t=super.toJSON();return t.focus=this.focus,t.aspect=this.aspect,t}}class Gc extends Wn{constructor(t,e,n=0,i=Math.PI/3,s=0,r=2){super(t,e);this.isSpotLight=!0,this.type="SpotLight",this.position.copy(re.DEFAULT_UP),this.updateMatrix(),this.target=new re,this.distance=n,this.angle=i,this.penumbra=s,this.decay=r,this.map=null,this.shadow=new Af}get power(){return this.intensity*Math.PI}set power(t){this.intensity=t/Math.PI}dispose(){super.dispose(),this.shadow.dispose()}copy(t,e){return super.copy(t,e),this.distance=t.distance,this.angle=t.angle,this.penumbra=t.penumbra,this.decay=t.decay,this.target=t.target.clone(),this.map=t.map,this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);if(e.object.distance=this.distance,e.object.angle=this.angle,e.object.decay=this.decay,e.object.penumbra=this.penumbra,e.object.target=this.target.uuid,this.map&&this.map.isTexture)e.object.map=this.map.toJSON(t).uuid;return e.object.shadow=this.shadow.toJSON(),e}}class wf extends pr{constructor(){super(new Le(90,1,0.5,500));this.isPointLightShadow=!0}}class kc extends Wn{constructor(t,e,n=0,i=2){super(t,e);this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=i,this.shadow=new wf}get power(){return this.intensity*4*Math.PI}set power(t){this.intensity=t/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(t,e){return super.copy(t,e),this.distance=t.distance,this.decay=t.decay,this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.distance=this.distance,e.object.decay=this.decay,e.object.shadow=this.shadow.toJSON(),e}}class ci extends mr{constructor(t=-1,e=1,n=1,i=-1,s=0.1,r=2000){super();this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=i,this.near=s,this.far=r,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,i,s,r){if(this.view===null)this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1};this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=i,this.view.width=s,this.view.height=r,this.updateProjectionMatrix()}clearViewOffset(){if(this.view!==null)this.view.enabled=!1;this.updateProjectionMatrix()}updateProjectionMatrix(){let t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,i=(this.top+this.bottom)/2,s=n-t,r=n+t,a=i+e,o=i-e;if(this.view!==null&&this.view.enabled){let l=(this.right-this.left)/this.view.fullWidth/this.zoom,c=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=l*this.view.offsetX,r=s+l*this.view.width,a-=c*this.view.offsetY,o=a-c*this.view.height}this.projectionMatrix.makeOrthographic(s,r,a,o,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);if(e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null)e.object.view=Object.assign({},this.view);return e}}class Cf extends pr{constructor(){super(new ci(-5,5,5,-5,0.5,500));this.isDirectionalLightShadow=!0}}class Hc extends Wn{constructor(t,e){super(t,e);this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(re.DEFAULT_UP),this.updateMatrix(),this.target=new re,this.shadow=new Cf}dispose(){super.dispose(),this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.shadow=this.shadow.toJSON(),e.object.target=this.target.uuid,e}}class Vc extends Wn{constructor(t,e){super(t,e);this.isAmbientLight=!0,this.type="AmbientLight"}}class Wc extends Wn{constructor(t,e,n=10,i=10){super(t,e);this.isRectAreaLight=!0,this.type="RectAreaLight",this.width=n,this.height=i}get power(){return this.intensity*this.width*this.height*Math.PI}set power(t){this.intensity=t/(this.width*this.height*Math.PI)}copy(t){return super.copy(t),this.width=t.width,this.height=t.height,this}toJSON(t){let e=super.toJSON(t);return e.object.width=this.width,e.object.height=this.height,e}}class co{constructor(){this.isSphericalHarmonics3=!0,this.coefficients=[];for(let t=0;t<9;t++)this.coefficients.push(new R)}set(t){for(let e=0;e<9;e++)this.coefficients[e].copy(t[e]);return this}zero(){for(let t=0;t<9;t++)this.coefficients[t].set(0,0,0);return this}getAt(t,e){let{x:n,y:i,z:s}=t,r=this.coefficients;return e.copy(r[0]).multiplyScalar(0.282095),e.addScaledVector(r[1],0.488603*i),e.addScaledVector(r[2],0.488603*s),e.addScaledVector(r[3],0.488603*n),e.addScaledVector(r[4],1.092548*(n*i)),e.addScaledVector(r[5],1.092548*(i*s)),e.addScaledVector(r[6],0.315392*(3*s*s-1)),e.addScaledVector(r[7],1.092548*(n*s)),e.addScaledVector(r[8],0.546274*(n*n-i*i)),e}getIrradianceAt(t,e){let{x:n,y:i,z:s}=t,r=this.coefficients;return e.copy(r[0]).multiplyScalar(0.886227),e.addScaledVector(r[1],1.023328*i),e.addScaledVector(r[2],1.023328*s),e.addScaledVector(r[3],1.023328*n),e.addScaledVector(r[4],0.858086*n*i),e.addScaledVector(r[5],0.858086*i*s),e.addScaledVector(r[6],0.743125*s*s-0.247708),e.addScaledVector(r[7],0.858086*n*s),e.addScaledVector(r[8],0.429043*(n*n-i*i)),e}add(t){for(let e=0;e<9;e++)this.coefficients[e].add(t.coefficients[e]);return this}addScaledSH(t,e){for(let n=0;n<9;n++)this.coefficients[n].addScaledVector(t.coefficients[n],e);return this}scale(t){for(let e=0;e<9;e++)this.coefficients[e].multiplyScalar(t);return this}lerp(t,e){for(let n=0;n<9;n++)this.coefficients[n].lerp(t.coefficients[n],e);return this}equals(t){for(let e=0;e<9;e++)if(!this.coefficients[e].equals(t.coefficients[e]))return!1;return!0}copy(t){return this.set(t.coefficients)}clone(){return new this.constructor().copy(this)}fromArray(t,e=0){let n=this.coefficients;for(let i=0;i<9;i++)n[i].fromArray(t,e+i*3);return this}toArray(t=[],e=0){let n=this.coefficients;for(let i=0;i<9;i++)n[i].toArray(t,e+i*3);return t}static getBasisAt(t,e){let{x:n,y:i,z:s}=t;e[0]=0.282095,e[1]=0.488603*i,e[2]=0.488603*s,e[3]=0.488603*n,e[4]=1.092548*n*i,e[5]=1.092548*i*s,e[6]=0.315392*(3*s*s-1),e[7]=1.092548*n*s,e[8]=0.546274*(n*n-i*i)}}class Xc extends Wn{constructor(t=new co,e=1){super(void 0,e);this.isLightProbe=!0,this.sh=t}copy(t){return super.copy(t),this.sh.copy(t.sh),this}toJSON(t){let e=super.toJSON(t);return e.object.sh=this.sh.toArray(),e}}var Mu={};class ho extends Ye{constructor(t){super(t);this.textures={}}load(t,e,n,i){let s=this,r=new An(s.manager);r.setPath(s.path),r.setRequestHeader(s.requestHeader),r.setWithCredentials(s.withCredentials),r.load(t,function(a){try{e(s.parse(JSON.parse(a)))}catch(o){if(i)i(o);else Lt(o);s.manager.itemError(t)}},n,i)}parse(t){let e=this.createMaterialFromType(t.type);return e.fromJSON(t,this.textures),e}setTextures(t){return this.textures=t,this}createMaterialFromType(t){return ho.createMaterialFromType(t)}static createMaterialFromType(t){let n={ShadowMaterial:Ac,SpriteMaterial:La,RawShaderMaterial:eo,ShaderMaterial:De,PointsMaterial:Fa,MeshPhysicalMaterial:Cc,MeshStandardMaterial:no,MeshPhongMaterial:Rc,MeshToonMaterial:Ic,MeshNormalMaterial:Pc,MeshLambertMaterial:Lc,MeshDepthMaterial:io,MeshDistanceMaterial:so,MeshBasicMaterial:xn,MeshMatcapMaterial:Nc,LineDashedMaterial:Uc,LineBasicMaterial:He,Material:Ue,...Mu}[t],i;if(n===void 0)Gn(`MaterialLoader: Unknown material type "${t}". Use .registerMaterial() before starting the deserialization process.`),i=new Ue;else i=new n;return i}static registerMaterial(t,e){Mu[t]=e}}class pa{static extractUrlBase(t){let e=t.lastIndexOf("/");if(e===-1)return"./";return t.slice(0,e+1)}static resolveURL(t,e){if(typeof t!=="string"||t==="")return"";if(/^https?:\/\//i.test(e)&&/^\//.test(t))e=e.replace(/(^https?:\/\/[^\/]+).*/i,"$1");if(/^(https?:)?\/\//i.test(t))return t;if(/^data:.*,.*$/i.test(t))return t;if(/^blob:.*$/i.test(t))return t;return e+t}}class qc extends Wt{constructor(){super();this.isInstancedBufferGeometry=!0,this.type="InstancedBufferGeometry",this.instanceCount=1/0}copy(t){return super.copy(t),this.instanceCount=t.instanceCount,this}toJSON(){let t=super.toJSON();return t.instanceCount=this.instanceCount,t.isInstancedBufferGeometry=!0,t}}class Yc extends Ye{constructor(t){super(t)}load(t,e,n,i){let s=this,r=new An(s.manager);r.setPath(s.path),r.setRequestHeader(s.requestHeader),r.setWithCredentials(s.withCredentials),r.load(t,function(a){try{e(s.parse(JSON.parse(a)))}catch(o){if(i)i(o);else Lt(o);s.manager.itemError(t)}},n,i)}parse(t){let e={},n={};function i(u,f){if(e[f]!==void 0)return e[f];let _=u.interleavedBuffers[f],g=s(u,_.buffer),p=os(_.type,g),S=new vs(p,_.stride);if(S.uuid=_.uuid,_.usage!==void 0)S.setUsage(_.usage);return e[f]=S,S}function s(u,f){if(n[f]!==void 0)return n[f];let _=u.arrayBuffers[f],g=new Uint32Array(_).buffer;return n[f]=g,g}let r=t.isInstancedBufferGeometry?new qc:new Wt,a=t.data.index;if(a!==void 0){let u=os(a.type,a.array);r.setIndex(new ce(u,1))}let o=t.data.attributes;for(let u in o){let f=o[u],m;if(f.isInterleavedBufferAttribute){let _=i(t.data,f.data);m=new ei(_,f.itemSize,f.offset,f.normalized)}else{let _=os(f.type,f.array);m=new(f.isInstancedBufferAttribute?ni:ce)(_,f.itemSize,f.normalized)}if(f.name!==void 0)m.name=f.name;if(f.usage!==void 0)m.setUsage(f.usage);if(f.gpuType!==void 0)m.gpuType=f.gpuType;r.setAttribute(u,m)}let l=t.data.morphAttributes;if(l)for(let u in l){let f=l[u],m=[];for(let _=0,g=f.length;_<g;_++){let p=f[_],S;if(p.isInterleavedBufferAttribute){let E=i(t.data,p.data);S=new ei(E,p.itemSize,p.offset,p.normalized)}else{let E=os(p.type,p.array);S=new ce(E,p.itemSize,p.normalized)}if(p.name!==void 0)S.name=p.name;if(p.usage!==void 0)S.setUsage(p.usage);if(p.gpuType!==void 0)S.gpuType=p.gpuType;m.push(S)}r.morphAttributes[u]=m}if(t.data.morphTargetsRelative)r.morphTargetsRelative=!0;let h=t.data.groups||t.data.drawcalls||t.data.offsets;if(h!==void 0)for(let u=0,f=h.length;u!==f;++u){let m=h[u];r.addGroup(m.start,m.count,m.materialIndex)}let d=t.data.boundingSphere;if(d!==void 0)r.boundingSphere=new Ne().fromJSON(d);if(t.name)r.name=t.name;if(t.userData)r.userData=t.userData;return r}}var Ko={};class Rf extends Ye{constructor(t){super(t)}load(t,e,n,i){let s=this,r=this.path===""?pa.extractUrlBase(t):this.path;this.resourcePath=this.resourcePath||r;let a=new An(this.manager);a.setPath(this.path),a.setRequestHeader(this.requestHeader),a.setWithCredentials(this.withCredentials),a.load(t,function(o){let l=null;try{l=JSON.parse(o)}catch(h){if(i!==void 0)i(h);Lt("ObjectLoader: Can't parse "+t+".",h.message);return}let c=l.metadata;if(c===void 0||c.type===void 0||c.type.toLowerCase()==="geometry"){if(i!==void 0)i(Error("THREE.ObjectLoader: Can't load "+t));Lt("ObjectLoader: Can't load "+t);return}s.parse(l,e)},n,i)}async loadAsync(t,e){let n=this,i=this.path===""?pa.extractUrlBase(t):this.path;this.resourcePath=this.resourcePath||i;let s=new An(this.manager);s.setPath(this.path),s.setRequestHeader(this.requestHeader),s.setWithCredentials(this.withCredentials);let r=await s.loadAsync(t,e),a;try{a=JSON.parse(r)}catch(l){throw Error("THREE.ObjectLoader: Can't parse "+t+". "+l.message)}let o=a.metadata;if(o===void 0||o.type===void 0||o.type.toLowerCase()==="geometry")throw Error("THREE.ObjectLoader: Can't load "+t);return await n.parseAsync(a)}parse(t,e){let n=this.parseAnimations(t.animations),i=this.parseShapes(t.shapes),s=this.parseGeometries(t.geometries,i),r=this.parseImages(t.images,function(){if(e!==void 0)e(l)}),a=this.parseTextures(t.textures,r),o=this.parseMaterials(t.materials,a),l=this.parseObject(t.object,s,o,a,n),c=this.parseSkeletons(t.skeletons,l);if(this.bindSkeletons(l,c),this.bindLightTargets(l),e!==void 0){let h=!1;for(let d in r)if(r[d].data instanceof HTMLImageElement){h=!0;break}if(h===!1)e(l)}return l}async parseAsync(t){let e=this.parseAnimations(t.animations),n=this.parseShapes(t.shapes),i=this.parseGeometries(t.geometries,n),s=await this.parseImagesAsync(t.images),r=this.parseTextures(t.textures,s),a=this.parseMaterials(t.materials,r),o=this.parseObject(t.object,i,a,r,e),l=this.parseSkeletons(t.skeletons,o);return this.bindSkeletons(o,l),this.bindLightTargets(o),o}static registerGeometry(t,e){Ko[t]=e}parseShapes(t){let e={};if(t!==void 0)for(let n=0,i=t.length;n<i;n++){let s=new Ss().fromJSON(t[n]);e[s.uuid]=s}return e}parseSkeletons(t,e){let n={},i={};if(e.traverse(function(s){if(s.isBone)i[s.uuid]=s}),t!==void 0)for(let s=0,r=t.length;s<r;s++){let a=new Ua().fromJSON(t[s],i);n[a.uuid]=a}return n}parseGeometries(t,e){let n={};if(t!==void 0){let i=new Yc;for(let s=0,r=t.length;s<r;s++){let a,o=t[s];switch(o.type){case"BufferGeometry":case"InstancedBufferGeometry":a=i.parse(o);break;default:if(o.type in pu)a=pu[o.type].fromJSON(o,e);else if(o.type in Ko)a=Ko[o.type].fromJSON(o,e);else dt(`ObjectLoader: Unknown geometry type "${o.type}". Use .registerGeometry() before starting the deserialization process.`)}if(a.uuid=o.uuid,o.name!==void 0)a.name=o.name;if(o.userData!==void 0)a.userData=o.userData;n[o.uuid]=a}}return n}parseMaterials(t,e){let n={},i={};if(t!==void 0){let s=new ho;s.setTextures(e);for(let r=0,a=t.length;r<a;r++){let o=t[r];if(n[o.uuid]===void 0)n[o.uuid]=s.parse(o);i[o.uuid]=n[o.uuid]}}return i}parseAnimations(t){let e={};if(t!==void 0)for(let n=0;n<t.length;n++){let i=t[n],s=ds.parse(i);e[s.uuid]=s}return e}parseImages(t,e){let n=this,i={},s;function r(o){return o=n.manager.resolveURL(o),n.manager.itemStart(o),s.load(o,function(){n.manager.itemEnd(o)},void 0,function(){n.manager.itemError(o),n.manager.itemEnd(o)})}function a(o){if(typeof o==="string"){let l=o,c=/^(\/\/)|([a-z]+:(\/\/)?)/i.test(l)?l:n.resourcePath+l;return r(c)}else if(o.data)return{data:os(o.type,o.data),width:o.width,height:o.height};else return null}if(t!==void 0&&t.length>0){let o=new lo(e);s=new fs(o),s.setCrossOrigin(this.crossOrigin);for(let l=0,c=t.length;l<c;l++){let h=t[l],d=h.url;if(Array.isArray(d)){let u=[];for(let f=0,m=d.length;f<m;f++){let _=d[f],g=a(_);if(g!==null)if(g instanceof HTMLImageElement)u.push(g);else u.push(new sn(g.data,g.width,g.height))}i[h.uuid]=new Tn(u)}else{let u=a(h.url);i[h.uuid]=new Tn(u)}}}return i}async parseImagesAsync(t){let e=this,n={},i;async function s(r){if(typeof r==="string"){let a=r,o=/^(\/\/)|([a-z]+:(\/\/)?)/i.test(a)?a:e.resourcePath+a;return await i.loadAsync(o)}else if(r.data)return{data:os(r.type,r.data),width:r.width,height:r.height};else return null}if(t!==void 0&&t.length>0){i=new fs(this.manager),i.setCrossOrigin(this.crossOrigin);for(let r=0,a=t.length;r<a;r++){let o=t[r],l=o.url;if(Array.isArray(l)){let c=[];for(let h=0,d=l.length;h<d;h++){let u=l[h],f=await s(u);if(f!==null)if(f instanceof HTMLImageElement)c.push(f);else c.push(new sn(f.data,f.width,f.height))}n[o.uuid]=new Tn(c)}else{let c=await s(o.url);n[o.uuid]=new Tn(c)}}}return n}parseTextures(t,e){function n(s,r){if(typeof s==="number")return s;return dt("ObjectLoader.parseTexture: Constant should be in numeric form.",s),r[s]}let i={};if(t!==void 0)for(let s=0,r=t.length;s<r;s++){let a=t[s];if(a.image===void 0)dt('ObjectLoader: No "image" specified for',a.uuid);if(e[a.image]===void 0)dt("ObjectLoader: Undefined image",a.image);let o=e[a.image],l=o.data,c;if(Array.isArray(l)){if(c=new ys,l.length===6)c.needsUpdate=!0}else{if(l&&l.data)c=new sn;else c=new Se;if(l)c.needsUpdate=!0}if(c.source=o,c.uuid=a.uuid,a.name!==void 0)c.name=a.name;if(a.mapping!==void 0)c.mapping=n(a.mapping,V_);if(a.channel!==void 0)c.channel=a.channel;if(a.offset!==void 0)c.offset.fromArray(a.offset);if(a.repeat!==void 0)c.repeat.fromArray(a.repeat);if(a.center!==void 0)c.center.fromArray(a.center);if(a.rotation!==void 0)c.rotation=a.rotation;if(a.wrap!==void 0)c.wrapS=n(a.wrap[0],bu),c.wrapT=n(a.wrap[1],bu);if(a.format!==void 0)c.format=a.format;if(a.internalFormat!==void 0)c.internalFormat=a.internalFormat;if(a.type!==void 0)c.type=a.type;if(a.colorSpace!==void 0)c.colorSpace=a.colorSpace;if(a.minFilter!==void 0)c.minFilter=n(a.minFilter,Tu);if(a.magFilter!==void 0)c.magFilter=n(a.magFilter,Tu);if(a.anisotropy!==void 0)c.anisotropy=a.anisotropy;if(a.flipY!==void 0)c.flipY=a.flipY;if(a.generateMipmaps!==void 0)c.generateMipmaps=a.generateMipmaps;if(a.premultiplyAlpha!==void 0)c.premultiplyAlpha=a.premultiplyAlpha;if(a.unpackAlignment!==void 0)c.unpackAlignment=a.unpackAlignment;if(a.compareFunction!==void 0)c.compareFunction=a.compareFunction;if(a.normalized!==void 0)c.normalized=a.normalized;if(a.userData!==void 0)c.userData=a.userData;i[a.uuid]=c}return i}parseObject(t,e,n,i,s){let r;function a(d){if(e[d]===void 0)dt("ObjectLoader: Undefined geometry",d);return e[d]}function o(d){if(d===void 0)return;if(Array.isArray(d)){let u=[];for(let f=0,m=d.length;f<m;f++){let _=d[f];if(n[_]===void 0)dt("ObjectLoader: Undefined material",_);u.push(n[_])}return u}if(n[d]===void 0)dt("ObjectLoader: Undefined material",d);return n[d]}function l(d){if(i[d]===void 0)dt("ObjectLoader: Undefined texture",d);return i[d]}let c,h;switch(t.type){case"Scene":if(r=new lc,t.background!==void 0)if(Number.isInteger(t.background))r.background=new _t(t.background);else r.background=l(t.background);if(t.environment!==void 0)r.environment=l(t.environment);if(t.fog!==void 0){if(t.fog.type==="Fog")r.fog=new Ra(t.fog.color,t.fog.near,t.fog.far);else if(t.fog.type==="FogExp2")r.fog=new Ca(t.fog.color,t.fog.density);if(t.fog.name!=="")r.fog.name=t.fog.name}if(t.backgroundBlurriness!==void 0)r.backgroundBlurriness=t.backgroundBlurriness;if(t.backgroundIntensity!==void 0)r.backgroundIntensity=t.backgroundIntensity;if(t.backgroundRotation!==void 0)r.backgroundRotation.fromArray(t.backgroundRotation);if(t.environmentIntensity!==void 0)r.environmentIntensity=t.environmentIntensity;if(t.environmentRotation!==void 0)r.environmentRotation.fromArray(t.environmentRotation);break;case"PerspectiveCamera":if(r=new Le(t.fov,t.aspect,t.near,t.far),t.focus!==void 0)r.focus=t.focus;if(t.zoom!==void 0)r.zoom=t.zoom;if(t.filmGauge!==void 0)r.filmGauge=t.filmGauge;if(t.filmOffset!==void 0)r.filmOffset=t.filmOffset;if(t.view!==void 0)r.view=Object.assign({},t.view);break;case"OrthographicCamera":if(r=new ci(t.left,t.right,t.top,t.bottom,t.near,t.far),t.zoom!==void 0)r.zoom=t.zoom;if(t.view!==void 0)r.view=Object.assign({},t.view);break;case"AmbientLight":r=new Vc(t.color,t.intensity);break;case"DirectionalLight":r=new Hc(t.color,t.intensity),r.target=t.target||"";break;case"PointLight":r=new kc(t.color,t.intensity,t.distance,t.decay);break;case"RectAreaLight":r=new Wc(t.color,t.intensity,t.width,t.height);break;case"SpotLight":r=new Gc(t.color,t.intensity,t.distance,t.angle,t.penumbra,t.decay),r.target=t.target||"";break;case"HemisphereLight":r=new zc(t.color,t.groundColor,t.intensity);break;case"LightProbe":let d=new co().fromArray(t.sh);r=new Xc(d,t.intensity);break;case"SkinnedMesh":if(c=a(t.geometry),h=o(t.material),r=new uc(c,h),t.bindMode!==void 0)r.bindMode=t.bindMode;if(t.bindMatrix!==void 0)r.bindMatrix.fromArray(t.bindMatrix);if(t.skeleton!==void 0)r.skeleton=t.skeleton;break;case"Mesh":c=a(t.geometry),h=o(t.material),r=new Me(c,h);break;case"InstancedMesh":c=a(t.geometry),h=o(t.material);let{count:u,instanceMatrix:f,instanceColor:m}=t;if(r=new dc(c,h,u),r.instanceMatrix=new ni(new Float32Array(f.array),16),m!==void 0)r.instanceColor=new ni(new Float32Array(m.array),m.itemSize);break;case"BatchedMesh":if(c=a(t.geometry),h=o(t.material),r=new fc(t.maxInstanceCount,t.maxVertexCount,t.maxIndexCount,h),r.geometry=c,r.perObjectFrustumCulled=t.perObjectFrustumCulled,r.sortObjects=t.sortObjects,r._drawRanges=t.drawRanges,r._reservedRanges=t.reservedRanges,r._geometryInfo=t.geometryInfo.map((_)=>{let g=null,p=null;if(_.boundingBox!==void 0)g=new Fe().fromJSON(_.boundingBox);if(_.boundingSphere!==void 0)p=new Ne().fromJSON(_.boundingSphere);return{..._,boundingBox:g,boundingSphere:p}}),r._instanceInfo=t.instanceInfo,r._availableInstanceIds=t._availableInstanceIds,r._availableGeometryIds=t._availableGeometryIds,r._nextIndexStart=t.nextIndexStart,r._nextVertexStart=t.nextVertexStart,r._geometryCount=t.geometryCount,r._maxInstanceCount=t.maxInstanceCount,r._maxVertexCount=t.maxVertexCount,r._maxIndexCount=t.maxIndexCount,r._geometryInitialized=t.geometryInitialized,r._matricesTexture=l(t.matricesTexture.uuid),r._indirectTexture=l(t.indirectTexture.uuid),t.colorsTexture!==void 0)r._colorsTexture=l(t.colorsTexture.uuid);if(t.boundingSphere!==void 0)r.boundingSphere=new Ne().fromJSON(t.boundingSphere);if(t.boundingBox!==void 0)r.boundingBox=new Fe().fromJSON(t.boundingBox);break;case"LOD":r=new hc;break;case"Line":r=new Hn(a(t.geometry),o(t.material));break;case"LineLoop":r=new pc(a(t.geometry),o(t.material));break;case"LineSegments":r=new vn(a(t.geometry),o(t.material));break;case"PointCloud":case"Points":r=new mc(a(t.geometry),o(t.material));break;case"Sprite":r=new cc(o(t.material));break;case"Group":r=new bi;break;case"Bone":r=new Na;break;default:r=new re}if(r.uuid=t.uuid,t.name!==void 0)r.name=t.name;if(t.matrix!==void 0){if(r.matrix.fromArray(t.matrix),t.matrixAutoUpdate!==void 0)r.matrixAutoUpdate=t.matrixAutoUpdate;if(r.matrixAutoUpdate)r.matrix.decompose(r.position,r.quaternion,r.scale)}else{if(t.position!==void 0)r.position.fromArray(t.position);if(t.rotation!==void 0)r.rotation.fromArray(t.rotation);if(t.quaternion!==void 0)r.quaternion.fromArray(t.quaternion);if(t.scale!==void 0)r.scale.fromArray(t.scale)}if(t.up!==void 0)r.up.fromArray(t.up);if(t.pivot!==void 0)r.pivot=new R().fromArray(t.pivot);if(t.morphTargetDictionary!==void 0)r.morphTargetDictionary=Object.assign({},t.morphTargetDictionary);if(t.morphTargetInfluences!==void 0)r.morphTargetInfluences=t.morphTargetInfluences.slice();if(t.castShadow!==void 0)r.castShadow=t.castShadow;if(t.receiveShadow!==void 0)r.receiveShadow=t.receiveShadow;if(t.shadow){if(t.shadow.intensity!==void 0)r.shadow.intensity=t.shadow.intensity;if(t.shadow.bias!==void 0)r.shadow.bias=t.shadow.bias;if(t.shadow.normalBias!==void 0)r.shadow.normalBias=t.shadow.normalBias;if(t.shadow.radius!==void 0)r.shadow.radius=t.shadow.radius;if(t.shadow.blurSamples!==void 0)r.shadow.blurSamples=t.shadow.blurSamples;if(t.shadow.focus!==void 0)r.shadow.focus=t.shadow.focus;if(t.shadow.aspect!==void 0)r.shadow.aspect=t.shadow.aspect;if(t.shadow.mapSize!==void 0)r.shadow.mapSize.fromArray(t.shadow.mapSize);if(t.shadow.camera!==void 0)r.shadow.camera=this.parseObject(t.shadow.camera)}if(t.visible!==void 0)r.visible=t.visible;if(t.frustumCulled!==void 0)r.frustumCulled=t.frustumCulled;if(t.renderOrder!==void 0)r.renderOrder=t.renderOrder;if(t.static!==void 0)r.static=t.static;if(t.userData!==void 0)r.userData=t.userData;if(t.layers!==void 0)r.layers.mask=t.layers;if(t.children!==void 0){let d=t.children;for(let u=0;u<d.length;u++)r.add(this.parseObject(d[u],e,n,i,s))}if(t.animations!==void 0){let d=t.animations;for(let u=0;u<d.length;u++){let f=d[u];r.animations.push(s[f])}}if(t.type==="LOD"){if(t.autoUpdate!==void 0)r.autoUpdate=t.autoUpdate;let d=t.levels;for(let u=0;u<d.length;u++){let f=d[u],m=r.getObjectByProperty("uuid",f.object);if(m!==void 0)r.addLevel(m,f.distance,f.hysteresis)}}return r}bindSkeletons(t,e){if(Object.keys(e).length===0)return;t.traverse(function(n){if(n.isSkinnedMesh===!0&&n.skeleton!==void 0){let i=e[n.skeleton];if(i===void 0)dt("ObjectLoader: No skeleton found with UUID:",n.skeleton);else n.bind(i,n.bindMatrix)}})}bindLightTargets(t){t.traverse(function(e){if(e.isDirectionalLight||e.isSpotLight){let n=e.target,i=t.getObjectByProperty("uuid",n);if(i!==void 0)e.target=i;else e.target=new re}})}}var V_={UVMapping:300,CubeReflectionMapping:301,CubeRefractionMapping:302,EquirectangularReflectionMapping:303,EquirectangularRefractionMapping:304,CubeUVReflectionMapping:306},bu={RepeatWrapping:1000,ClampToEdgeWrapping:1001,MirroredRepeatWrapping:1002},Tu={NearestFilter:1003,NearestMipmapNearestFilter:1004,NearestMipmapLinearFilter:1005,LinearFilter:1006,LinearMipmapNearestFilter:1007,LinearMipmapLinearFilter:1008},Qo=new WeakMap;class If extends Ye{constructor(t){super(t);if(this.isImageBitmapLoader=!0,typeof createImageBitmap>"u")dt("ImageBitmapLoader: createImageBitmap() not supported.");if(typeof fetch>"u")dt("ImageBitmapLoader: fetch() not supported.");this.options={premultiplyAlpha:"none"},this._abortController=new AbortController}setOptions(t){return this.options=t,this}load(t,e,n,i){if(t===void 0)t="";if(this.path!==void 0)t=this.path+t;t=this.manager.resolveURL(t);let s=this,r=En.get(`image-bitmap:${t}`);if(r!==void 0){if(s.manager.itemStart(t),r.then){r.then((l)=>{if(Qo.has(r)===!0){if(i)i(Qo.get(r));s.manager.itemError(t),s.manager.itemEnd(t)}else{if(e)e(l);s.manager.itemEnd(t)}});return}setTimeout(function(){if(e)e(r);s.manager.itemEnd(t)},0);return}let a={};a.credentials=this.crossOrigin==="anonymous"?"same-origin":"include",a.headers=this.requestHeader,a.signal=typeof AbortSignal.any==="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal;let o=fetch(t,a).then(function(l){return l.blob()}).then(function(l){return createImageBitmap(l,Object.assign({},s.options,{colorSpaceConversion:"none"}))}).then(function(l){if(En.add(`image-bitmap:${t}`,l),e)e(l);return s.manager.itemEnd(t),l}).catch(function(l){if(i)i(l);Qo.set(o,l),En.remove(`image-bitmap:${t}`),s.manager.itemError(t),s.manager.itemEnd(t)});En.add(`image-bitmap:${t}`,o),s.manager.itemStart(t)}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}var sa;class uo{static getContext(){if(sa===void 0)sa=new(window.AudioContext||window.webkitAudioContext);return sa}static setContext(t){sa=t}}class Pf extends Ye{constructor(t){super(t)}load(t,e,n,i){let s=this,r=new An(this.manager);r.setResponseType("arraybuffer"),r.setPath(this.path),r.setRequestHeader(this.requestHeader),r.setWithCredentials(this.withCredentials),r.load(t,function(o){try{let l=o.slice(0),c=uo.getContext(),h=t+"#decode";s.manager.itemStart(h),c.decodeAudioData(l,function(d){e(d),s.manager.itemEnd(h)}).catch(function(d){a(d),s.manager.itemEnd(h)})}catch(l){a(l)}},n,i);function a(o){if(i)i(o);else Lt(o);s.manager.itemError(t)}}}var Eu=new Vt,Au=new Vt,_i=new Vt;class Lf{constructor(){this.type="StereoCamera",this.aspect=1,this.eyeSep=0.064,this.cameraL=new Le,this.cameraL.layers.enable(1),this.cameraL.matrixAutoUpdate=!1,this.cameraR=new Le,this.cameraR.layers.enable(2),this.cameraR.matrixAutoUpdate=!1,this._cache={focus:null,fov:null,aspect:null,near:null,far:null,zoom:null,eyeSep:null}}update(t){let e=this._cache;if(e.focus!==t.focus||e.fov!==t.fov||e.aspect!==t.aspect*this.aspect||e.near!==t.near||e.far!==t.far||e.zoom!==t.zoom||e.eyeSep!==this.eyeSep){e.focus=t.focus,e.fov=t.fov,e.aspect=t.aspect*this.aspect,e.near=t.near,e.far=t.far,e.zoom=t.zoom,e.eyeSep=this.eyeSep,_i.copy(t.projectionMatrix);let i=e.eyeSep/2,s=i*e.near/e.focus,r=e.near*Math.tan(Ti*e.fov*0.5)/e.zoom,a,o;Au.elements[12]=-i,Eu.elements[12]=i,a=-r*e.aspect+s,o=r*e.aspect+s,_i.elements[0]=2*e.near/(o-a),_i.elements[8]=(o+a)/(o-a),this.cameraL.projectionMatrix.copy(_i),a=-r*e.aspect-s,o=r*e.aspect-s,_i.elements[0]=2*e.near/(o-a),_i.elements[8]=(o+a)/(o-a),this.cameraR.projectionMatrix.copy(_i)}this.cameraL.matrix.copy(t.matrixWorld).multiply(Au),this.cameraL.matrixWorldNeedsUpdate=!0,this.cameraR.matrix.copy(t.matrixWorld).multiply(Eu),this.cameraR.matrixWorldNeedsUpdate=!0}}var is=-90,ss=1;class Zc extends re{constructor(t,e,n){super();this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let i=new Le(is,ss,t,e);i.layers=this.layers,this.add(i);let s=new Le(is,ss,t,e);s.layers=this.layers,this.add(s);let r=new Le(is,ss,t,e);r.layers=this.layers,this.add(r);let a=new Le(is,ss,t,e);a.layers=this.layers,this.add(a);let o=new Le(is,ss,t,e);o.layers=this.layers,this.add(o);let l=new Le(is,ss,t,e);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){let t=this.coordinateSystem,e=this.children.concat(),[n,i,s,r,a,o]=e;for(let l of e)this.remove(l);if(t===2000)n.up.set(0,1,0),n.lookAt(1,0,0),i.up.set(0,1,0),i.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),r.up.set(0,0,1),r.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),o.up.set(0,1,0),o.lookAt(0,0,-1);else if(t===2001)n.up.set(0,-1,0),n.lookAt(-1,0,0),i.up.set(0,-1,0),i.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),r.up.set(0,0,-1),r.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),o.up.set(0,-1,0),o.lookAt(0,0,-1);else throw Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(let l of e)this.add(l),l.updateMatrixWorld()}update(t,e){if(this.parent===null)this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:i}=this;if(this.coordinateSystem!==t.coordinateSystem)this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem();let[s,r,a,o,l,c]=this.children,h=t.getRenderTarget(),d=t.getActiveCubeFace(),u=t.getActiveMipmapLevel(),f=t.xr.enabled;t.xr.enabled=!1;let m=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let _=!1;if(t.isWebGLRenderer===!0)_=t.state.buffers.depth.getReversed();else _=t.reversedDepthBuffer;if(t.setRenderTarget(n,0,i),_&&t.autoClear===!1)t.clearDepth();if(t.render(e,s),t.setRenderTarget(n,1,i),_&&t.autoClear===!1)t.clearDepth();if(t.render(e,r),t.setRenderTarget(n,2,i),_&&t.autoClear===!1)t.clearDepth();if(t.render(e,a),t.setRenderTarget(n,3,i),_&&t.autoClear===!1)t.clearDepth();if(t.render(e,o),t.setRenderTarget(n,4,i),_&&t.autoClear===!1)t.clearDepth();if(t.render(e,l),n.texture.generateMipmaps=m,t.setRenderTarget(n,5,i),_&&t.autoClear===!1)t.clearDepth();t.render(e,c),t.setRenderTarget(h,d,u),t.xr.enabled=f,n.texture.needsPMREMUpdate=!0}}class Jc extends Le{constructor(t=[]){super();this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t}}class $c{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(t){if(this._document=t,t.hidden!==void 0)this._pageVisibilityHandler=W_.bind(this),t.addEventListener("visibilitychange",this._pageVisibilityHandler,!1)}disconnect(){if(this._pageVisibilityHandler!==null)this._document.removeEventListener("visibilitychange",this._pageVisibilityHandler),this._pageVisibilityHandler=null;this._document=null}getDelta(){return this._delta/1000}getElapsed(){return this._elapsed/1000}getTimescale(){return this._timescale}setTimescale(t){return this._timescale=t,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(t){if(this._pageVisibilityHandler!==null&&this._document.hidden===!0)this._delta=0;else this._previousTime=this._currentTime,this._currentTime=(t!==void 0?t:performance.now())-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta;return this}}function W_(){if(this._document.hidden===!1)this.reset()}var xi=new R,jo=new ke,X_=new R,vi=new R,yi=new R;class Nf extends re{constructor(){super();this.type="AudioListener",this.context=uo.getContext(),this.gain=this.context.createGain(),this.gain.connect(this.context.destination),this.filter=null,this.timeDelta=0,this._timer=new $c}getInput(){return this.gain}removeFilter(){if(this.filter!==null)this.gain.disconnect(this.filter),this.filter.disconnect(this.context.destination),this.gain.connect(this.context.destination),this.filter=null;return this}getFilter(){return this.filter}setFilter(t){if(this.filter!==null)this.gain.disconnect(this.filter),this.filter.disconnect(this.context.destination);else this.gain.disconnect(this.context.destination);return this.filter=t,this.gain.connect(this.filter),this.filter.connect(this.context.destination),this}getMasterVolume(){return this.gain.gain.value}setMasterVolume(t){return this.gain.gain.setTargetAtTime(t,this.context.currentTime,0.01),this}updateMatrixWorld(t){super.updateMatrixWorld(t),this._timer.update();let e=this.context.listener;if(this.timeDelta=this._timer.getDelta(),this.matrixWorld.decompose(xi,jo,X_),vi.set(0,0,-1).applyQuaternion(jo),yi.set(0,1,0).applyQuaternion(jo),e.positionX){let n=this.context.currentTime+this.timeDelta;e.positionX.linearRampToValueAtTime(xi.x,n),e.positionY.linearRampToValueAtTime(xi.y,n),e.positionZ.linearRampToValueAtTime(xi.z,n),e.forwardX.linearRampToValueAtTime(vi.x,n),e.forwardY.linearRampToValueAtTime(vi.y,n),e.forwardZ.linearRampToValueAtTime(vi.z,n),e.upX.linearRampToValueAtTime(yi.x,n),e.upY.linearRampToValueAtTime(yi.y,n),e.upZ.linearRampToValueAtTime(yi.z,n)}else e.setPosition(xi.x,xi.y,xi.z),e.setOrientation(vi.x,vi.y,vi.z,yi.x,yi.y,yi.z)}}class Kc extends re{constructor(t){super();this.type="Audio",this.listener=t,this.context=t.context,this.gain=this.context.createGain(),this.gain.connect(t.getInput()),this.autoplay=!1,this.buffer=null,this.detune=0,this.loop=!1,this.loopStart=0,this.loopEnd=0,this.offset=0,this.duration=void 0,this.playbackRate=1,this.isPlaying=!1,this.hasPlaybackControl=!0,this.source=null,this.sourceType="empty",this._startedAt=0,this._progress=0,this._connected=!1,this.filters=[]}getOutput(){return this.gain}setNodeSource(t){return this.hasPlaybackControl=!1,this.sourceType="audioNode",this.source=t,this.connect(),this}setMediaElementSource(t){return this.hasPlaybackControl=!1,this.sourceType="mediaNode",this.source=this.context.createMediaElementSource(t),this.connect(),this}setMediaStreamSource(t){return this.hasPlaybackControl=!1,this.sourceType="mediaStreamNode",this.source=this.context.createMediaStreamSource(t),this.connect(),this}setBuffer(t){if(this.buffer=t,this.sourceType="buffer",this.autoplay)this.play();return this}play(t=0){if(this.isPlaying===!0){dt("Audio: Audio is already playing.");return}if(this.hasPlaybackControl===!1){dt("Audio: this Audio has no playback control.");return}this._startedAt=this.context.currentTime+t;let e=this.context.createBufferSource();return e.buffer=this.buffer,e.loop=this.loop,e.loopStart=this.loopStart,e.loopEnd=this.loopEnd,e.onended=this.onEnded.bind(this),e.start(this._startedAt,this._progress+this.offset,this.duration),this.isPlaying=!0,this.source=e,this.setDetune(this.detune),this.setPlaybackRate(this.playbackRate),this.connect()}pause(){if(this.hasPlaybackControl===!1){dt("Audio: this Audio has no playback control.");return}if(this.isPlaying===!0){if(this._progress+=Math.max(this.context.currentTime-this._startedAt,0)*this.playbackRate,this.loop===!0)this._progress=this._progress%(this.duration||this.buffer.duration);this.source.stop(),this.source.onended=null,this.isPlaying=!1}return this}stop(t=0){if(this.hasPlaybackControl===!1){dt("Audio: this Audio has no playback control.");return}if(this._progress=0,this.source!==null)this.source.stop(this.context.currentTime+t),this.source.onended=null;return this.isPlaying=!1,this}connect(){if(this.filters.length>0){this.source.connect(this.filters[0]);for(let t=1,e=this.filters.length;t<e;t++)this.filters[t-1].connect(this.filters[t]);this.filters[this.filters.length-1].connect(this.getOutput())}else this.source.connect(this.getOutput());return this._connected=!0,this}disconnect(){if(this._connected===!1)return;if(this.filters.length>0){this.source.disconnect(this.filters[0]);for(let t=1,e=this.filters.length;t<e;t++)this.filters[t-1].disconnect(this.filters[t]);this.filters[this.filters.length-1].disconnect(this.getOutput())}else this.source.disconnect(this.getOutput());return this._connected=!1,this}getFilters(){return this.filters}setFilters(t){if(!t)t=[];if(this._connected===!0)this.disconnect(),this.filters=t.slice(),this.connect();else this.filters=t.slice();return this}setDetune(t){if(this.detune=t,this.isPlaying===!0&&this.source.detune!==void 0)this.source.detune.setTargetAtTime(this.detune,this.context.currentTime,0.01);return this}getDetune(){return this.detune}getFilter(){return this.getFilters()[0]}setFilter(t){return this.setFilters(t?[t]:[])}setPlaybackRate(t){if(this.hasPlaybackControl===!1){dt("Audio: this Audio has no playback control.");return}if(this.playbackRate=t,this.isPlaying===!0)this.source.playbackRate.setTargetAtTime(this.playbackRate,this.context.currentTime,0.01);return this}getPlaybackRate(){return this.playbackRate}onEnded(){this.isPlaying=!1,this._progress=0}getLoop(){if(this.hasPlaybackControl===!1)return dt("Audio: this Audio has no playback control."),!1;return this.loop}setLoop(t){if(this.hasPlaybackControl===!1){dt("Audio: this Audio has no playback control.");return}if(this.loop=t,this.isPlaying===!0)this.source.loop=this.loop;return this}setLoopStart(t){return this.loopStart=t,this}setLoopEnd(t){return this.loopEnd=t,this}getVolume(){return this.gain.gain.value}setVolume(t){return this.gain.gain.setTargetAtTime(t,this.context.currentTime,0.01),this}copy(t,e){if(super.copy(t,e),t.sourceType!=="buffer")return dt("Audio: Audio source type cannot be copied."),this;return this.autoplay=t.autoplay,this.buffer=t.buffer,this.detune=t.detune,this.loop=t.loop,this.loopStart=t.loopStart,this.loopEnd=t.loopEnd,this.offset=t.offset,this.duration=t.duration,this.playbackRate=t.playbackRate,this.hasPlaybackControl=t.hasPlaybackControl,this.sourceType=t.sourceType,this.filters=t.filters.slice(),this}clone(t){return new this.constructor(this.listener).copy(this,t)}}var Si=new R,wu=new ke,q_=new R,Mi=new R;class Uf extends Kc{constructor(t){super(t);this.panner=this.context.createPanner(),this.panner.panningModel="HRTF",this.panner.connect(this.gain)}connect(){return super.connect(),this.panner.connect(this.gain),this}disconnect(){return super.disconnect(),this.panner.disconnect(this.gain),this}getOutput(){return this.panner}getRefDistance(){return this.panner.refDistance}setRefDistance(t){return this.panner.refDistance=t,this}getRolloffFactor(){return this.panner.rolloffFactor}setRolloffFactor(t){return this.panner.rolloffFactor=t,this}getDistanceModel(){return this.panner.distanceModel}setDistanceModel(t){return this.panner.distanceModel=t,this}getMaxDistance(){return this.panner.maxDistance}setMaxDistance(t){return this.panner.maxDistance=t,this}setDirectionalCone(t,e,n){return this.panner.coneInnerAngle=t,this.panner.coneOuterAngle=e,this.panner.coneOuterGain=n,this}updateMatrixWorld(t){if(super.updateMatrixWorld(t),this.hasPlaybackControl===!0&&this.isPlaying===!1)return;this.matrixWorld.decompose(Si,wu,q_),Mi.set(0,0,1).applyQuaternion(wu);let e=this.panner;if(e.positionX){let n=this.context.currentTime+this.listener.timeDelta;e.positionX.linearRampToValueAtTime(Si.x,n),e.positionY.linearRampToValueAtTime(Si.y,n),e.positionZ.linearRampToValueAtTime(Si.z,n),e.orientationX.linearRampToValueAtTime(Mi.x,n),e.orientationY.linearRampToValueAtTime(Mi.y,n),e.orientationZ.linearRampToValueAtTime(Mi.z,n)}else e.setPosition(Si.x,Si.y,Si.z),e.setOrientation(Mi.x,Mi.y,Mi.z)}}class Df{constructor(t,e=2048){this.analyser=t.context.createAnalyser(),this.analyser.fftSize=e,this.data=new Uint8Array(this.analyser.frequencyBinCount),t.getOutput().connect(this.analyser)}getFrequencyData(){return this.analyser.getByteFrequencyData(this.data),this.data}getAverageFrequency(){let t=0,e=this.getFrequencyData();for(let n=0;n<e.length;n++)t+=e[n];return t/e.length}}class Qc{constructor(t,e,n){this.binding=t,this.valueSize=n;let i,s,r;switch(e){case"quaternion":i=this._slerp,s=this._slerpAdditive,r=this._setAdditiveIdentityQuaternion,this.buffer=new Float64Array(n*6),this._workIndex=5;break;case"string":case"bool":i=this._select,s=this._select,r=this._setAdditiveIdentityOther,this.buffer=Array(n*5);break;default:i=this._lerp,s=this._lerpAdditive,r=this._setAdditiveIdentityNumeric,this.buffer=new Float64Array(n*5)}this._mixBufferRegion=i,this._mixBufferRegionAdditive=s,this._setIdentity=r,this._origIndex=3,this._addIndex=4,this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,this.useCount=0,this.referenceCount=0}accumulate(t,e){let n=this.buffer,i=this.valueSize,s=t*i+i,r=this.cumulativeWeight;if(r===0){for(let a=0;a!==i;++a)n[s+a]=n[a];r=e}else{r+=e;let a=e/r;this._mixBufferRegion(n,s,0,a,i)}this.cumulativeWeight=r}accumulateAdditive(t){let e=this.buffer,n=this.valueSize,i=n*this._addIndex;if(this.cumulativeWeightAdditive===0)this._setIdentity();this._mixBufferRegionAdditive(e,i,0,t,n),this.cumulativeWeightAdditive+=t}apply(t){let e=this.valueSize,n=this.buffer,i=t*e+e,s=this.cumulativeWeight,r=this.cumulativeWeightAdditive,a=this.binding;if(this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,s<1){let o=e*this._origIndex;this._mixBufferRegion(n,i,o,1-s,e)}if(r>0)this._mixBufferRegionAdditive(n,i,this._addIndex*e,1,e);for(let o=e,l=e+e;o!==l;++o)if(n[o]!==n[o+e]){a.setValue(n,i);break}}saveOriginalState(){let t=this.binding,e=this.buffer,n=this.valueSize,i=n*this._origIndex;t.getValue(e,i);for(let s=n,r=i;s!==r;++s)e[s]=e[i+s%n];this._setIdentity(),this.cumulativeWeight=0,this.cumulativeWeightAdditive=0}restoreOriginalState(){let t=this.valueSize*3;this.binding.setValue(this.buffer,t)}_setAdditiveIdentityNumeric(){let t=this._addIndex*this.valueSize,e=t+this.valueSize;for(let n=t;n<e;n++)this.buffer[n]=0}_setAdditiveIdentityQuaternion(){this._setAdditiveIdentityNumeric(),this.buffer[this._addIndex*this.valueSize+3]=1}_setAdditiveIdentityOther(){let t=this._origIndex*this.valueSize,e=this._addIndex*this.valueSize;for(let n=0;n<this.valueSize;n++)this.buffer[e+n]=this.buffer[t+n]}_select(t,e,n,i,s){if(i>=0.5)for(let r=0;r!==s;++r)t[e+r]=t[n+r]}_slerp(t,e,n,i){ke.slerpFlat(t,e,t,e,t,n,i)}_slerpAdditive(t,e,n,i,s){let r=this._workIndex*s;ke.multiplyQuaternionsFlat(t,r,t,e,t,n),ke.slerpFlat(t,e,t,e,t,r,i)}_lerp(t,e,n,i,s){let r=1-i;for(let a=0;a!==s;++a){let o=e+a;t[o]=t[o]*r+t[n+a]*i}}_lerpAdditive(t,e,n,i,s){for(let r=0;r!==s;++r){let a=e+r;t[a]=t[a]+t[n+r]*i}}}var jc="\\[\\]\\.:\\/",Y_=new RegExp("["+jc+"]","g"),th="[^"+jc+"]",Z_="[^"+jc.replace("\\.","")+"]",J_=/((?:WC+[\/:])*)/.source.replace("WC",th),$_=/(WCOD+)?/.source.replace("WCOD",Z_),K_=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",th),Q_=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",th),j_=new RegExp("^"+J_+$_+K_+Q_+"$"),t0=["material","materials","bones","map"];class Ff{constructor(t,e,n){let i=n||se.parseTrackName(e);this._targetGroup=t,this._bindings=t.subscribe_(e,i)}getValue(t,e){this.bind();let n=this._targetGroup.nCachedObjects_,i=this._bindings[n];if(i!==void 0)i.getValue(t,e)}setValue(t,e){let n=this._bindings;for(let i=this._targetGroup.nCachedObjects_,s=n.length;i!==s;++i)n[i].setValue(t,e)}bind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].bind()}unbind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].unbind()}}class se{constructor(t,e,n){this.path=e,this.parsedPath=n||se.parseTrackName(e),this.node=se.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,e,n){if(!(t&&t.isAnimationObjectGroup))return new se(t,e,n);else return new se.Composite(t,e,n)}static sanitizeNodeName(t){return t.replace(/\s/g,"_").replace(Y_,"")}static parseTrackName(t){let e=j_.exec(t);if(e===null)throw Error("THREE.PropertyBinding: Cannot parse trackName: "+t);let n={nodeName:e[2],objectName:e[3],objectIndex:e[4],propertyName:e[5],propertyIndex:e[6]},i=n.nodeName&&n.nodeName.lastIndexOf(".");if(i!==void 0&&i!==-1){let s=n.nodeName.substring(i+1);if(t0.indexOf(s)!==-1)n.nodeName=n.nodeName.substring(0,i),n.objectName=s}if(n.propertyName===null||n.propertyName.length===0)throw Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+t);return n}static findNode(t,e){if(e===void 0||e===""||e==="."||e===-1||e===t.name||e===t.uuid)return t;if(t.skeleton){let n=t.skeleton.getBoneByName(e);if(n!==void 0)return n}if(t.children){let n=function(s){for(let r=0;r<s.length;r++){let a=s[r];if(a.name===e||a.uuid===e)return a;let o=n(a.children);if(o)return o}return null},i=n(t.children);if(i)return i}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(t,e){t[e]=this.targetObject[this.propertyName]}_getValue_array(t,e){let n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)t[e++]=n[i]}_getValue_arrayElement(t,e){t[e]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(t,e){this.resolvedProperty.toArray(t,e)}_setValue_direct(t,e){this.targetObject[this.propertyName]=t[e]}_setValue_direct_setNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(t,e){let n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)n[i]=t[e++]}_setValue_array_setNeedsUpdate(t,e){let n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)n[i]=t[e++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(t,e){let n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)n[i]=t[e++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(t,e){this.resolvedProperty[this.propertyIndex]=t[e]}_setValue_arrayElement_setNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(t,e){this.resolvedProperty.fromArray(t,e)}_setValue_fromArray_setNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(t,e){this.bind(),this.getValue(t,e)}_setValue_unbound(t,e){this.bind(),this.setValue(t,e)}bind(){let t=this.node,e=this.parsedPath,{objectName:n,propertyName:i,propertyIndex:s}=e;if(!t)t=se.findNode(this.rootNode,e.nodeName),this.node=t;if(this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){dt("PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let l=e.objectIndex;switch(n){case"materials":if(!t.material){Lt("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.materials){Lt("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}t=t.material.materials;break;case"bones":if(!t.skeleton){Lt("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}t=t.skeleton.bones;for(let c=0;c<t.length;c++)if(t[c].name===l){l=c;break}break;case"map":if("map"in t){t=t.map;break}if(!t.material){Lt("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.map){Lt("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}t=t.material.map;break;default:if(t[n]===void 0){Lt("PropertyBinding: Can not bind to objectName of node undefined.",this);return}t=t[n]}if(l!==void 0){if(t[l]===void 0){Lt("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,t);return}t=t[l]}}let r=t[i];if(r===void 0){let l=e.nodeName;Lt("PropertyBinding: Trying to update property for track: "+l+"."+i+" but it wasn't found.",t);return}let a=this.Versioning.None;if(this.targetObject=t,t.isMaterial===!0)a=this.Versioning.NeedsUpdate;else if(t.isObject3D===!0)a=this.Versioning.MatrixWorldNeedsUpdate;let o=this.BindingType.Direct;if(s!==void 0){if(i==="morphTargetInfluences"){if(!t.geometry){Lt("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!t.geometry.morphAttributes){Lt("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}if(t.morphTargetDictionary[s]!==void 0)s=t.morphTargetDictionary[s]}o=this.BindingType.ArrayElement,this.resolvedProperty=r,this.propertyIndex=s}else if(r.fromArray!==void 0&&r.toArray!==void 0)o=this.BindingType.HasFromToArray,this.resolvedProperty=r;else if(Array.isArray(r))o=this.BindingType.EntireArray,this.resolvedProperty=r;else this.propertyName=i;this.getValue=this.GetterByBindingType[o],this.setValue=this.SetterByBindingTypeAndVersioning[o][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}}se.Composite=Ff;se.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};se.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};se.prototype.GetterByBindingType=[se.prototype._getValue_direct,se.prototype._getValue_array,se.prototype._getValue_arrayElement,se.prototype._getValue_toArray];se.prototype.SetterByBindingTypeAndVersioning=[[se.prototype._setValue_direct,se.prototype._setValue_direct_setNeedsUpdate,se.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[se.prototype._setValue_array,se.prototype._setValue_array_setNeedsUpdate,se.prototype._setValue_array_setMatrixWorldNeedsUpdate],[se.prototype._setValue_arrayElement,se.prototype._setValue_arrayElement_setNeedsUpdate,se.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[se.prototype._setValue_fromArray,se.prototype._setValue_fromArray_setNeedsUpdate,se.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];class Of{constructor(){this.isAnimationObjectGroup=!0,this.uuid=nn(),this._objects=Array.prototype.slice.call(arguments),this.nCachedObjects_=0;let t={};this._indicesByUUID=t;for(let n=0,i=arguments.length;n!==i;++n)t[arguments[n].uuid]=n;this._paths=[],this._parsedPaths=[],this._bindings=[],this._bindingsIndicesByPath={};let e=this;this.stats={objects:{get total(){return e._objects.length},get inUse(){return this.total-e.nCachedObjects_}},get bindingsPerObject(){return e._bindings.length}}}add(){let t=this._objects,e=this._indicesByUUID,n=this._paths,i=this._parsedPaths,s=this._bindings,r=s.length,a=void 0,o=t.length,l=this.nCachedObjects_;for(let c=0,h=arguments.length;c!==h;++c){let d=arguments[c],u=d.uuid,f=e[u];if(f===void 0){f=o++,e[u]=f,t.push(d);for(let m=0,_=r;m!==_;++m)s[m].push(new se(d,n[m],i[m]))}else if(f<l){a=t[f];let m=--l,_=t[m];e[_.uuid]=f,t[f]=_,e[u]=m,t[m]=d;for(let g=0,p=r;g!==p;++g){let S=s[g],E=S[m],x=S[f];if(S[f]=E,x===void 0)x=new se(d,n[g],i[g]);S[m]=x}}else if(t[f]!==a)Lt("AnimationObjectGroup: Different objects with the same UUID detected. Clean the caches or recreate your infrastructure when reloading scenes.")}this.nCachedObjects_=l}remove(){let t=this._objects,e=this._indicesByUUID,n=this._bindings,i=n.length,s=this.nCachedObjects_;for(let r=0,a=arguments.length;r!==a;++r){let o=arguments[r],l=o.uuid,c=e[l];if(c!==void 0&&c>=s){let h=s++,d=t[h];e[d.uuid]=c,t[c]=d,e[l]=h,t[h]=o;for(let u=0,f=i;u!==f;++u){let m=n[u],_=m[h],g=m[c];m[c]=_,m[h]=g}}}this.nCachedObjects_=s}uncache(){let t=this._objects,e=this._indicesByUUID,n=this._bindings,i=n.length,s=this.nCachedObjects_,r=t.length;for(let a=0,o=arguments.length;a!==o;++a){let l=arguments[a],c=l.uuid,h=e[c];if(h!==void 0)if(delete e[c],h<s){let d=--s,u=t[d],f=--r,m=t[f];if(h!==d)e[u.uuid]=h;if(t[h]=u,d!==f)e[m.uuid]=d;t[d]=m,t.pop();for(let _=0,g=i;_!==g;++_){let p=n[_],S=p[d],E=p[f];p[h]=S,p[d]=E,p.pop()}}else{let d=--r,u=t[d];if(h!==d)e[u.uuid]=h;t[h]=u,t.pop();for(let f=0,m=i;f!==m;++f){let _=n[f];_[h]=_[d],_.pop()}}}this.nCachedObjects_=s}subscribe_(t,e){let n=this._bindingsIndicesByPath,i=n[t],s=this._bindings;if(i!==void 0)return s[i];let r=this._paths,a=this._parsedPaths,o=this._objects,l=o.length,c=this.nCachedObjects_,h=Array(l);i=s.length,n[t]=i,r.push(t),a.push(e),s.push(h);for(let d=c,u=o.length;d!==u;++d){let f=o[d];h[d]=new se(f,t,e)}return h}unsubscribe_(t){let e=this._bindingsIndicesByPath,n=e[t];if(n!==void 0){let i=this._paths,s=this._parsedPaths,r=this._bindings,a=r.length-1,o=r[a],l=i[a];e[l]=n,r[n]=o,r.pop(),s[n]=s[a],s.pop(),i[n]=i[a],i.pop()}}}class eh{constructor(t,e,n=null,i=e.blendMode){this._mixer=t,this._clip=e,this._localRoot=n,this.blendMode=i;let s=e.tracks,r=s.length,a=Array(r),o={endingStart:2400,endingEnd:2400};for(let l=0;l!==r;++l){let c=s[l].createInterpolant(null);a[l]=c,c.settings=o}this._interpolantSettings=o,this._interpolants=a,this._propertyBindings=Array(r),this._cacheIndex=null,this._byClipCacheIndex=null,this._timeScaleInterpolant=null,this._restoreTimeScale=null,this._weightInterpolant=null,this.loop=2201,this._loopCount=-1,this._startTime=null,this.time=0,this.timeScale=1,this._effectiveTimeScale=1,this.weight=1,this._effectiveWeight=1,this.repetitions=1/0,this.paused=!1,this.enabled=!0,this.clampWhenFinished=!1,this.zeroSlopeAtStart=!0,this.zeroSlopeAtEnd=!0}play(){return this._mixer._activateAction(this),this}stop(){return this._mixer._deactivateAction(this),this.reset()}reset(){return this.paused=!1,this.enabled=!0,this.time=0,this._loopCount=-1,this._startTime=null,this.stopFading().stopWarping()}isRunning(){return this.enabled&&!this.paused&&this.timeScale!==0&&this._startTime===null&&this._mixer._isActiveAction(this)}isScheduled(){return this._mixer._isActiveAction(this)}startAt(t){return this._startTime=t,this}setLoop(t,e){return this.loop=t,this.repetitions=e,this}setEffectiveWeight(t){return this.weight=t,this._effectiveWeight=this.enabled?t:0,this.stopFading()}getEffectiveWeight(){return this._effectiveWeight}fadeIn(t){return this._scheduleFading(t,0,1)}fadeOut(t){return this._scheduleFading(t,1,0)}crossFadeFrom(t,e,n=!1){if(t.fadeOut(e),this.fadeIn(e),n===!0){let i=this._clip.duration,s=t._clip.duration,r=s/i,a=i/s;t._restoreTimeScale=t.timeScale,this._restoreTimeScale=this.timeScale,t.warp(1,r,e),this.warp(a,1,e)}return this}crossFadeTo(t,e,n=!1){return t.crossFadeFrom(this,e,n)}stopFading(){let t=this._weightInterpolant;if(t!==null)this._weightInterpolant=null,this._mixer._takeBackControlInterpolant(t);return this}setEffectiveTimeScale(t){return this.timeScale=t,this._effectiveTimeScale=this.paused?0:t,this.stopWarping()}getEffectiveTimeScale(){return this._effectiveTimeScale}setDuration(t){return this.timeScale=this._clip.duration/t,this.stopWarping()}syncWith(t){return this.time=t.time,this.timeScale=t.timeScale,this.stopWarping()}halt(t){return this.warp(this._effectiveTimeScale,0,t)}warp(t,e,n){let i=this._mixer,s=i.time,r=this.timeScale,a=this._timeScaleInterpolant;if(a===null)a=i._lendControlInterpolant(),this._timeScaleInterpolant=a;let o=a.parameterPositions,l=a.sampleValues;return o[0]=s,o[1]=s+n,l[0]=t/r,l[1]=e/r,this}stopWarping(){let t=this._timeScaleInterpolant;if(t!==null)this._timeScaleInterpolant=null,this._mixer._takeBackControlInterpolant(t);return this._restoreTimeScale=null,this}getMixer(){return this._mixer}getClip(){return this._clip}getRoot(){return this._localRoot||this._mixer._root}_update(t,e,n,i){if(!this.enabled){this._updateWeight(t);return}let s=this._startTime;if(s!==null){let o=(t-s)*n;if(o<0||n===0)e=0;else this._startTime=null,e=n*o}e*=this._updateTimeScale(t);let r=this._updateTime(e),a=this._updateWeight(t);if(a>0){let o=this._interpolants,l=this._propertyBindings;switch(this.blendMode){case 2501:for(let c=0,h=o.length;c!==h;++c)o[c].evaluate(r),l[c].accumulateAdditive(a);break;case 2500:default:for(let c=0,h=o.length;c!==h;++c)o[c].evaluate(r),l[c].accumulate(i,a)}}}_updateWeight(t){let e=0;if(this.enabled){e=this.weight;let n=this._weightInterpolant;if(n!==null){let i=n.evaluate(t)[0];if(e*=i,t>n.parameterPositions[1]){if(this.stopFading(),i===0)this.enabled=!1}}}return this._effectiveWeight=e,e}_updateTimeScale(t){let e=0;if(!this.paused){e=this.timeScale;let n=this._timeScaleInterpolant;if(n!==null){let i=n.evaluate(t)[0];if(e*=i,t>n.parameterPositions[1]){if(e===0)this.paused=!0;else{if(this._restoreTimeScale!==null)e=this._restoreTimeScale;this.timeScale=e}this.stopWarping()}}}return this._effectiveTimeScale=e,e}_updateTime(t){let e=this._clip.duration,n=this.loop,i=this.time+t,s=this._loopCount,r=n===2202;if(t===0){if(s===-1)return i;return r&&(s&1)===1?e-i:i}if(n===2200){if(s===-1)this._loopCount=0,this._setEndings(!0,!0,!1);t:{if(i>=e)i=e;else if(i<0)i=0;else{this.time=i;break t}if(this.clampWhenFinished)this.paused=!0;else this.enabled=!1;this.time=i,this._mixer.dispatchEvent({type:"finished",action:this,direction:t<0?-1:1})}}else{if(s===-1)if(t>=0)s=0,this._setEndings(!0,this.repetitions===0,r);else this._setEndings(this.repetitions===0,!0,r);if(i>=e||i<0){let a=Math.floor(i/e);i-=e*a,s+=Math.abs(a);let o=this.repetitions-s;if(o<=0){if(this.clampWhenFinished)this.paused=!0;else this.enabled=!1;i=t>0?e:0,this.time=i,this._mixer.dispatchEvent({type:"finished",action:this,direction:t>0?1:-1})}else{if(o===1){let l=t<0;this._setEndings(l,!l,r)}else this._setEndings(!1,!1,r);this._loopCount=s,this.time=i,this._mixer.dispatchEvent({type:"loop",action:this,loopDelta:a})}}else this._loopCount=s,this.time=i;if(r&&(s&1)===1)return e-i}return i}_setEndings(t,e,n){let i=this._interpolantSettings;if(n)i.endingStart=2401,i.endingEnd=2401;else{if(t)i.endingStart=this.zeroSlopeAtStart?2401:2400;else i.endingStart=2402;if(e)i.endingEnd=this.zeroSlopeAtEnd?2401:2400;else i.endingEnd=2402}}_scheduleFading(t,e,n){let i=this._mixer,s=i.time,r=this._weightInterpolant;if(r===null)r=i._lendControlInterpolant(),this._weightInterpolant=r;let a=r.parameterPositions,o=r.sampleValues;return a[0]=s,o[0]=e,a[1]=s+t,o[1]=n,this}}var e0=new Float32Array(1);class Bf extends ln{constructor(t){super();if(this._root=t,this._initMemoryManager(),this._accuIndex=0,this.time=0,this.timeScale=1,typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}_bindAction(t,e){let n=t._localRoot||this._root,i=t._clip.tracks,s=i.length,{_propertyBindings:r,_interpolants:a}=t,o=n.uuid,l=this._bindingsByRootAndName,c=l[o];if(c===void 0)c={},l[o]=c;for(let h=0;h!==s;++h){let d=i[h],u=d.name,f=c[u];if(f!==void 0)++f.referenceCount,r[h]=f;else{if(f=r[h],f!==void 0){if(f._cacheIndex===null)++f.referenceCount,this._addInactiveBinding(f,o,u);continue}let m=e&&e._propertyBindings[h].binding.parsedPath;f=new Qc(se.create(n,u,m),d.ValueTypeName,d.getValueSize()),++f.referenceCount,this._addInactiveBinding(f,o,u),r[h]=f}a[h].resultBuffer=f.buffer}}_activateAction(t){if(!this._isActiveAction(t)){if(t._cacheIndex===null){let n=(t._localRoot||this._root).uuid,i=t._clip.uuid,s=this._actionsByClip[i];this._bindAction(t,s&&s.knownActions[0]),this._addInactiveAction(t,i,n)}let e=t._propertyBindings;for(let n=0,i=e.length;n!==i;++n){let s=e[n];if(s.useCount++===0)this._lendBinding(s),s.saveOriginalState()}this._lendAction(t)}}_deactivateAction(t){if(this._isActiveAction(t)){let e=t._propertyBindings;for(let n=0,i=e.length;n!==i;++n){let s=e[n];if(--s.useCount===0)s.restoreOriginalState(),this._takeBackBinding(s)}this._takeBackAction(t)}}_initMemoryManager(){this._actions=[],this._nActiveActions=0,this._actionsByClip={},this._bindings=[],this._nActiveBindings=0,this._bindingsByRootAndName={},this._controlInterpolants=[],this._nActiveControlInterpolants=0;let t=this;this.stats={actions:{get total(){return t._actions.length},get inUse(){return t._nActiveActions}},bindings:{get total(){return t._bindings.length},get inUse(){return t._nActiveBindings}},controlInterpolants:{get total(){return t._controlInterpolants.length},get inUse(){return t._nActiveControlInterpolants}}}}_isActiveAction(t){let e=t._cacheIndex;return e!==null&&e<this._nActiveActions}_addInactiveAction(t,e,n){let i=this._actions,s=this._actionsByClip,r=s[e];if(r===void 0)r={knownActions:[t],actionByRoot:{}},t._byClipCacheIndex=0,s[e]=r;else{let a=r.knownActions;t._byClipCacheIndex=a.length,a.push(t)}t._cacheIndex=i.length,i.push(t),r.actionByRoot[n]=t}_removeInactiveAction(t){let e=this._actions,n=e[e.length-1],i=t._cacheIndex;n._cacheIndex=i,e[i]=n,e.pop(),t._cacheIndex=null;let s=t._clip.uuid,r=this._actionsByClip,a=r[s],o=a.knownActions,l=o[o.length-1],c=t._byClipCacheIndex;l._byClipCacheIndex=c,o[c]=l,o.pop(),t._byClipCacheIndex=null;let h=a.actionByRoot,d=(t._localRoot||this._root).uuid;if(delete h[d],o.length===0)delete r[s];this._removeInactiveBindingsForAction(t)}_removeInactiveBindingsForAction(t){let e=t._propertyBindings;for(let n=0,i=e.length;n!==i;++n){let s=e[n];if(--s.referenceCount===0)this._removeInactiveBinding(s)}}_lendAction(t){let e=this._actions,n=t._cacheIndex,i=this._nActiveActions++,s=e[i];t._cacheIndex=i,e[i]=t,s._cacheIndex=n,e[n]=s}_takeBackAction(t){let e=this._actions,n=t._cacheIndex,i=--this._nActiveActions,s=e[i];t._cacheIndex=i,e[i]=t,s._cacheIndex=n,e[n]=s}_addInactiveBinding(t,e,n){let i=this._bindingsByRootAndName,s=this._bindings,r=i[e];if(r===void 0)r={},i[e]=r;r[n]=t,t._cacheIndex=s.length,s.push(t)}_removeInactiveBinding(t){let e=this._bindings,n=t.binding,i=n.rootNode.uuid,s=n.path,r=this._bindingsByRootAndName,a=r[i],o=e[e.length-1],l=t._cacheIndex;if(o._cacheIndex=l,e[l]=o,e.pop(),delete a[s],Object.keys(a).length===0)delete r[i]}_lendBinding(t){let e=this._bindings,n=t._cacheIndex,i=this._nActiveBindings++,s=e[i];t._cacheIndex=i,e[i]=t,s._cacheIndex=n,e[n]=s}_takeBackBinding(t){let e=this._bindings,n=t._cacheIndex,i=--this._nActiveBindings,s=e[i];t._cacheIndex=i,e[i]=t,s._cacheIndex=n,e[n]=s}_lendControlInterpolant(){let t=this._controlInterpolants,e=this._nActiveControlInterpolants++,n=t[e];if(n===void 0)n=new ro(new Float32Array(2),new Float32Array(2),1,e0),n.__cacheIndex=e,t[e]=n;return n}_takeBackControlInterpolant(t){let e=this._controlInterpolants,n=t.__cacheIndex,i=--this._nActiveControlInterpolants,s=e[i];t.__cacheIndex=i,e[i]=t,s.__cacheIndex=n,e[n]=s}clipAction(t,e,n){let i=e||this._root,s=i.uuid,r=typeof t==="string"?ds.findByName(i,t):t,a=r!==null?r.uuid:t,o=this._actionsByClip[a],l=null;if(n===void 0)if(r!==null)n=r.blendMode;else n=2500;if(o!==void 0){let h=o.actionByRoot[s];if(h!==void 0&&h.blendMode===n)return h;if(l=o.knownActions[0],r===null)r=l._clip}if(r===null)return null;let c=new eh(this,r,e,n);return this._bindAction(c,l),this._addInactiveAction(c,a,s),c}existingAction(t,e){let n=e||this._root,i=n.uuid,s=typeof t==="string"?ds.findByName(n,t):t,r=s?s.uuid:t,a=this._actionsByClip[r];if(a!==void 0)return a.actionByRoot[i]||null;return null}stopAllAction(){let t=this._actions,e=this._nActiveActions;for(let n=e-1;n>=0;--n)t[n].stop();return this}update(t){t*=this.timeScale;let e=this._actions,n=this._nActiveActions,i=this.time+=t,s=Math.sign(t),r=this._accuIndex^=1;for(let l=0;l!==n;++l)e[l]._update(i,t,s,r);let a=this._bindings,o=this._nActiveBindings;for(let l=0;l!==o;++l)a[l].apply(r);return this}setTime(t){this.time=0;for(let e=0;e<this._actions.length;e++)this._actions[e].time=0;return this.update(t)}getRoot(){return this._root}uncacheClip(t){let e=this._actions,n=t.uuid,i=this._actionsByClip,s=i[n];if(s!==void 0){let r=s.knownActions;for(let a=0,o=r.length;a!==o;++a){let l=r[a];this._deactivateAction(l);let c=l._cacheIndex,h=e[e.length-1];l._cacheIndex=null,l._byClipCacheIndex=null,h._cacheIndex=c,e[c]=h,e.pop(),this._removeInactiveBindingsForAction(l)}delete i[n]}}uncacheRoot(t){let e=t.uuid,n=this._actionsByClip;for(let r in n){let a=n[r].actionByRoot,o=a[e];if(o!==void 0)this._deactivateAction(o),this._removeInactiveAction(o)}let i=this._bindingsByRootAndName,s=i[e];if(s!==void 0)for(let r in s){let a=s[r];a.restoreOriginalState(),this._removeInactiveBinding(a)}}uncacheAction(t,e){let n=this.existingAction(t,e);if(n!==null)this._deactivateAction(n),this._removeInactiveAction(n)}}class zf extends wa{constructor(t=1,e=1,n=1,i={}){super(t,e,i);this.isRenderTarget3D=!0,this.depth=n;for(let s=0;s<this.textures.length;s++){let r=new nr(null,t,e,n);r.isRenderTargetTexture=!0,r.renderTarget=this,this.textures[s]=r}this._setTextureOptions(i)}}class nh{constructor(t){this.value=t}clone(){return new nh(this.value.clone===void 0?this.value:this.value.clone())}}var n0=0;class Gf extends ln{constructor(){super();this.isUniformsGroup=!0,Object.defineProperty(this,"id",{value:n0++}),this.name="",this.usage=35044,this.uniforms=[]}add(t){return this.uniforms.push(t),this}remove(t){let e=this.uniforms.indexOf(t);if(e!==-1)this.uniforms.splice(e,1);return this}setName(t){return this.name=t,this}setUsage(t){return this.usage=t,this}dispose(){this.dispatchEvent({type:"dispose"})}copy(t){this.name=t.name,this.usage=t.usage;let e=t.uniforms;this.uniforms.length=0;for(let n=0,i=e.length;n<i;n++){let s=Array.isArray(e[n])?e[n]:[e[n]];for(let r=0;r<s.length;r++)this.uniforms.push(s[r].clone())}return this}clone(){return new this.constructor().copy(this)}}class kf extends vs{constructor(t,e,n=1){super(t,e);this.isInstancedInterleavedBuffer=!0,this.meshPerAttribute=n}copy(t){return super.copy(t),this.meshPerAttribute=t.meshPerAttribute,this}clone(t){let e=super.clone(t);return e.meshPerAttribute=this.meshPerAttribute,e}toJSON(t){let e=super.toJSON(t);return e.isInstancedInterleavedBuffer=!0,e.meshPerAttribute=this.meshPerAttribute,e}}class Hf{constructor(t,e,n,i,s,r=!1){this.isGLBufferAttribute=!0,this.name="",this.buffer=t,this.type=e,this.itemSize=n,this.elementSize=i,this.count=s,this.normalized=r,this.version=0}set needsUpdate(t){if(t===!0)this.version++}setBuffer(t){return this.buffer=t,this}setType(t,e){return this.type=t,this.elementSize=e,this}setItemSize(t){return this.itemSize=t,this}setCount(t){return this.count=t,this}}var Cu=new Vt;class Vf{constructor(t,e,n=0,i=1/0){this.ray=new Ni(t,e),this.near=n,this.far=i,this.camera=null,this.layers=new ir,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(t,e){this.ray.set(t,e)}setFromCamera(t,e){if(e.isPerspectiveCamera)this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(t.x,t.y,0.5).unproject(e).sub(this.ray.origin).normalize(),this.camera=e;else if(e.isOrthographicCamera)this.ray.origin.set(t.x,t.y,e.projectionMatrix.elements[14]).unproject(e),this.ray.direction.set(0,0,-1).transformDirection(e.matrixWorld),this.camera=e;else Lt("Raycaster: Unsupported camera type: "+e.type)}setFromXRController(t){return Cu.identity().extractRotation(t.matrixWorld),this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Cu),this}intersectObject(t,e=!0,n=[]){return ol(t,this,n,e),n.sort(Ru),n}intersectObjects(t,e=!0,n=[]){for(let i=0,s=t.length;i<s;i++)ol(t[i],this,n,e);return n.sort(Ru),n}}function Ru(t,e){return t.distance-e.distance}function ol(t,e,n,i){let s=!0;if(t.layers.test(e.layers)){if(t.raycast(e,n)===!1)s=!1}if(s===!0&&i===!0){let r=t.children;for(let a=0,o=r.length;a<o;a++)ol(r[a],e,n,!0)}}class Wf{constructor(t=!0){this.autoStart=t,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1,dt("Clock: This module has been deprecated. Please use THREE.Timer instead.")}start(){this.startTime=performance.now(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let t=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){let e=performance.now();t=(e-this.oldTime)/1000,this.oldTime=e,this.elapsedTime+=t}return t}}class Xf{constructor(t=1,e=0,n=0){this.radius=t,this.phi=e,this.theta=n}set(t,e,n){return this.radius=t,this.phi=e,this.theta=n,this}copy(t){return this.radius=t.radius,this.phi=t.phi,this.theta=t.theta,this}makeSafe(){return this.phi=Ht(this.phi,0.000001,Math.PI-0.000001),this}setFromVector3(t){return this.setFromCartesianCoords(t.x,t.y,t.z)}setFromCartesianCoords(t,e,n){if(this.radius=Math.sqrt(t*t+e*e+n*n),this.radius===0)this.theta=0,this.phi=0;else this.theta=Math.atan2(t,n),this.phi=Math.acos(Ht(e/this.radius,-1,1));return this}clone(){return new this.constructor().copy(this)}}class qf{constructor(t=1,e=0,n=0){this.radius=t,this.theta=e,this.y=n}set(t,e,n){return this.radius=t,this.theta=e,this.y=n,this}copy(t){return this.radius=t.radius,this.theta=t.theta,this.y=t.y,this}setFromVector3(t){return this.setFromCartesianCoords(t.x,t.y,t.z)}setFromCartesianCoords(t,e,n){return this.radius=Math.sqrt(t*t+n*n),this.theta=Math.atan2(t,n),this.y=e,this}clone(){return new this.constructor().copy(this)}}class ih{static{ih.prototype.isMatrix2=!0}constructor(t,e,n,i){if(this.elements=[1,0,0,1],t!==void 0)this.set(t,e,n,i)}identity(){return this.set(1,0,0,1),this}fromArray(t,e=0){for(let n=0;n<4;n++)this.elements[n]=t[n+e];return this}set(t,e,n,i){let s=this.elements;return s[0]=t,s[2]=e,s[1]=n,s[3]=i,this}}var Iu=new j;class sh{constructor(t=new j(1/0,1/0),e=new j(-1/0,-1/0)){this.isBox2=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){let n=Iu.copy(e).multiplyScalar(0.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=1/0,this.max.x=this.max.y=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y}getCenter(t){return this.isEmpty()?t.set(0,0):t.addVectors(this.min,this.max).multiplyScalar(0.5)}getSize(t){return this.isEmpty()?t.set(0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,Iu).distanceTo(t)}intersect(t){if(this.min.max(t.min),this.max.min(t.max),this.isEmpty())this.makeEmpty();return this}union(t){return this.min.min(t.min),this.max.max(t.max),this}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}}var Pu=new R,ra=new R,rs=new R,as=new R,tl=new R,i0=new R,s0=new R;class Yf{constructor(t=new R,e=new R){this.start=t,this.end=e}set(t,e){return this.start.copy(t),this.end.copy(e),this}copy(t){return this.start.copy(t.start),this.end.copy(t.end),this}getCenter(t){return t.addVectors(this.start,this.end).multiplyScalar(0.5)}delta(t){return t.subVectors(this.end,this.start)}distanceSq(){return this.start.distanceToSquared(this.end)}distance(){return this.start.distanceTo(this.end)}at(t,e){return this.delta(e).multiplyScalar(t).add(this.start)}closestPointToPointParameter(t,e){Pu.subVectors(t,this.start),ra.subVectors(this.end,this.start);let n=ra.dot(ra);if(n===0)return 0;let s=ra.dot(Pu)/n;if(e)s=Ht(s,0,1);return s}closestPointToPoint(t,e,n){let i=this.closestPointToPointParameter(t,e);return this.delta(n).multiplyScalar(i).add(this.start)}distanceSqToLine3(t,e=i0,n=s0){let s,r,a=this.start,o=t.start,l=this.end,c=t.end;rs.subVectors(l,a),as.subVectors(c,o),tl.subVectors(a,o);let h=rs.dot(rs),d=as.dot(as),u=as.dot(tl);if(h<=0.00000000000000010000000000000001&&d<=0.00000000000000010000000000000001)return e.copy(a),n.copy(o),e.sub(n),e.dot(e);if(h<=0.00000000000000010000000000000001)s=0,r=u/d,r=Ht(r,0,1);else{let f=rs.dot(tl);if(d<=0.00000000000000010000000000000001)r=0,s=Ht(-f/h,0,1);else{let m=rs.dot(as),_=h*d-m*m;if(_!==0)s=Ht((m*u-f*d)/_,0,1);else s=0;if(r=(m*s+u)/d,r<0)r=0,s=Ht(-f/h,0,1);else if(r>1)r=1,s=Ht((m-f)/h,0,1)}}return e.copy(a).addScaledVector(rs,s),n.copy(o).addScaledVector(as,r),e.distanceToSquared(n)}applyMatrix4(t){return this.start.applyMatrix4(t),this.end.applyMatrix4(t),this}equals(t){return t.start.equals(this.start)&&t.end.equals(this.end)}clone(){return new this.constructor().copy(this)}}var Lu=new R;class Zf extends re{constructor(t,e){super();this.light=t,this.matrixAutoUpdate=!1,this.color=e,this.type="SpotLightHelper";let n=new Wt,i=[0,0,0,0,0,1,0,0,0,1,0,1,0,0,0,-1,0,1,0,0,0,0,1,1,0,0,0,0,-1,1];for(let r=0,a=1,o=32;r<o;r++,a++){let l=r/o*Math.PI*2,c=a/o*Math.PI*2;i.push(Math.cos(l),Math.sin(l),1,Math.cos(c),Math.sin(c),1)}n.setAttribute("position",new Tt(i,3));let s=new He({fog:!1,toneMapped:!1});this.cone=new vn(n,s),this.add(this.cone),this.update()}dispose(){super.dispose(),this.cone.geometry.dispose(),this.cone.material.dispose()}update(){if(this.light.updateWorldMatrix(!0,!1),this.light.target.updateWorldMatrix(!0,!1),this.parent)this.parent.updateWorldMatrix(!0),this.matrix.copy(this.parent.matrixWorld).invert().multiply(this.light.matrixWorld);else this.matrix.copy(this.light.matrixWorld);this.matrixWorldNeedsUpdate=!0;let t=this.light.distance?this.light.distance:1000,e=t*Math.tan(this.light.angle);if(this.cone.scale.set(e,e,t),Lu.setFromMatrixPosition(this.light.target.matrixWorld),this.cone.lookAt(Lu),this.color!==void 0)this.cone.material.color.set(this.color);else this.cone.material.color.copy(this.light.color)}}var jn=new R,aa=new Vt,el=new Vt;class Jf extends vn{constructor(t){let e=$f(t),n=new Wt,i=[],s=[];for(let l=0;l<e.length;l++){let c=e[l];if(c.parent&&c.parent.isBone)i.push(0,0,0),i.push(0,0,0),s.push(0,0,0),s.push(0,0,0)}n.setAttribute("position",new Tt(i,3)),n.setAttribute("color",new Tt(s,3));let r=new He({vertexColors:!0,depthTest:!1,depthWrite:!1,toneMapped:!1,transparent:!0});super(n,r);this.isSkeletonHelper=!0,this.type="SkeletonHelper",this.root=t,this.bones=e,this.matrix=t.matrixWorld,this.matrixAutoUpdate=!1;let a=new _t(255),o=new _t(65280);this.setColors(a,o)}updateMatrixWorld(t){let e=this.bones,n=this.geometry,i=n.getAttribute("position");el.copy(this.root.matrixWorld).invert();for(let s=0,r=0;s<e.length;s++){let a=e[s];if(a.parent&&a.parent.isBone)aa.multiplyMatrices(el,a.matrixWorld),jn.setFromMatrixPosition(aa),i.setXYZ(r,jn.x,jn.y,jn.z),aa.multiplyMatrices(el,a.parent.matrixWorld),jn.setFromMatrixPosition(aa),i.setXYZ(r+1,jn.x,jn.y,jn.z),r+=2}n.getAttribute("position").needsUpdate=!0,super.updateMatrixWorld(t)}setColors(t,e){let i=this.geometry.getAttribute("color");for(let s=0;s<i.count;s+=2)i.setXYZ(s,t.r,t.g,t.b),i.setXYZ(s+1,e.r,e.g,e.b);return i.needsUpdate=!0,this}dispose(){super.dispose(),this.geometry.dispose(),this.material.dispose()}}function $f(t){let e=[];if(t.isBone===!0)e.push(t);for(let n=0;n<t.children.length;n++)e.push(...$f(t.children[n]));return e}class Kf extends Me{constructor(t,e,n){let i=new hr(e,4,2),s=new xn({wireframe:!0,fog:!1,toneMapped:!1});super(i,s);this.light=t,this.color=n,this.type="PointLightHelper",this.matrix=this.light.matrixWorld,this.matrixAutoUpdate=!1,this.update()}dispose(){super.dispose(),this.geometry.dispose(),this.material.dispose()}update(){if(this.matrixWorldNeedsUpdate=!0,this.light.updateWorldMatrix(!0,!1),this.color!==void 0)this.material.color.set(this.color);else this.material.color.copy(this.light.color)}}var r0=new R,Nu=new _t,Uu=new _t;class Qf extends re{constructor(t,e,n){super();this.light=t,this.matrix=t.matrixWorld,this.matrixAutoUpdate=!1,this.color=n,this.type="HemisphereLightHelper";let i=new cr(e);if(i.rotateY(Math.PI*0.5),this.material=new xn({wireframe:!0,fog:!1,toneMapped:!1}),this.color===void 0)this.material.vertexColors=!0;let s=i.getAttribute("position"),r=new Float32Array(s.count*3);i.setAttribute("color",new ce(r,3)),this.add(new Me(i,this.material)),this.update()}dispose(){super.dispose(),this.children[0].geometry.dispose(),this.children[0].material.dispose()}update(){let t=this.children[0];if(this.color!==void 0)this.material.color.set(this.color);else{let e=t.geometry.getAttribute("color");Nu.copy(this.light.color),Uu.copy(this.light.groundColor);for(let n=0,i=e.count;n<i;n++){let s=n<i/2?Nu:Uu;e.setXYZ(n,s.r,s.g,s.b)}e.needsUpdate=!0}this.matrixWorldNeedsUpdate=!0,this.light.updateWorldMatrix(!0,!1),t.lookAt(r0.setFromMatrixPosition(this.light.matrixWorld).negate())}}class jf extends vn{constructor(t=10,e=10,n=4473924,i=8947848){n=new _t(n),i=new _t(i);let s=e/2,r=t/e,a=t/2,o=[],l=[];for(let d=0,u=0,f=-a;d<=e;d++,f+=r){o.push(-a,0,f,a,0,f),o.push(f,0,-a,f,0,a);let m=d===s?n:i;m.toArray(l,u),u+=3,m.toArray(l,u),u+=3,m.toArray(l,u),u+=3,m.toArray(l,u),u+=3}let c=new Wt;c.setAttribute("position",new Tt(o,3)),c.setAttribute("color",new Tt(l,3));let h=new He({vertexColors:!0,toneMapped:!1});super(c,h);this.type="GridHelper"}dispose(){super.dispose(),this.geometry.dispose(),this.material.dispose()}}class tp extends vn{constructor(t=10,e=16,n=8,i=64,s=4473924,r=8947848){s=new _t(s),r=new _t(r);let a=[],o=[];if(e>1)for(let h=0;h<e;h++){let d=h/e*(Math.PI*2),u=Math.sin(d)*t,f=Math.cos(d)*t;a.push(0,0,0),a.push(u,0,f);let m=h&1?s:r;o.push(m.r,m.g,m.b),o.push(m.r,m.g,m.b)}for(let h=0;h<n;h++){let d=h&1?s:r,u=t-t/n*h;for(let f=0;f<i;f++){let m=f/i*(Math.PI*2),_=Math.sin(m)*u,g=Math.cos(m)*u;a.push(_,0,g),o.push(d.r,d.g,d.b),m=(f+1)/i*(Math.PI*2),_=Math.sin(m)*u,g=Math.cos(m)*u,a.push(_,0,g),o.push(d.r,d.g,d.b)}}let l=new Wt;l.setAttribute("position",new Tt(a,3)),l.setAttribute("color",new Tt(o,3));let c=new He({vertexColors:!0,toneMapped:!1});super(l,c);this.type="PolarGridHelper"}dispose(){super.dispose(),this.geometry.dispose(),this.material.dispose()}}var Du=new R,oa=new R,Fu=new R;class ep extends re{constructor(t,e,n){super();if(this.light=t,this.matrix=t.matrixWorld,this.matrixAutoUpdate=!1,this.color=n,this.type="DirectionalLightHelper",e===void 0)e=1;let i=new Wt;i.setAttribute("position",new Tt([-e,e,0,e,e,0,e,-e,0,-e,-e,0,-e,e,0],3));let s=new He({fog:!1,toneMapped:!1});this.lightPlane=new Hn(i,s),this.add(this.lightPlane),i=new Wt,i.setAttribute("position",new Tt([0,0,0,0,0,1],3)),this.targetLine=new Hn(i,s),this.add(this.targetLine),this.update()}dispose(){super.dispose(),this.lightPlane.geometry.dispose(),this.lightPlane.material.dispose(),this.targetLine.geometry.dispose(),this.targetLine.material.dispose()}update(){if(this.matrixWorldNeedsUpdate=!0,this.light.updateWorldMatrix(!0,!1),this.light.target.updateWorldMatrix(!0,!1),Du.setFromMatrixPosition(this.light.matrixWorld),oa.setFromMatrixPosition(this.light.target.matrixWorld),Fu.subVectors(oa,Du),this.lightPlane.lookAt(oa),this.color!==void 0)this.lightPlane.material.color.set(this.color),this.targetLine.material.color.set(this.color);else this.lightPlane.material.color.copy(this.light.color),this.targetLine.material.color.copy(this.light.color);this.targetLine.lookAt(oa),this.targetLine.scale.z=Fu.length()}}var la=new R,be=new mr;class np extends vn{constructor(t){let e=new Wt,n=new He({color:16777215,vertexColors:!0,toneMapped:!1}),i=[],s=[],r={};a("n1","n2"),a("n2","n4"),a("n4","n3"),a("n3","n1"),a("f1","f2"),a("f2","f4"),a("f4","f3"),a("f3","f1"),a("n1","f1"),a("n2","f2"),a("n3","f3"),a("n4","f4"),a("p","n1"),a("p","n2"),a("p","n3"),a("p","n4"),a("u1","u2"),a("u2","u3"),a("u3","u1"),a("c","t"),a("p","c"),a("cn1","cn2"),a("cn3","cn4"),a("cf1","cf2"),a("cf3","cf4");function a(f,m){o(f),o(m)}function o(f){if(i.push(0,0,0),s.push(0,0,0),r[f]===void 0)r[f]=[];r[f].push(i.length/3-1)}e.setAttribute("position",new Tt(i,3)),e.setAttribute("color",new Tt(s,3));super(e,n);if(this.type="CameraHelper",this.camera=t,this.camera.updateProjectionMatrix)this.camera.updateProjectionMatrix();this.matrix=t.matrixWorld,this.matrixAutoUpdate=!1,this.pointMap=r,this.update();let l=new _t(16755200),c=new _t(16711680),h=new _t(43775),d=new _t(16777215),u=new _t(3355443);this.setColors(l,c,h,d,u)}setColors(t,e,n,i,s){let a=this.geometry.getAttribute("color");return a.setXYZ(0,t.r,t.g,t.b),a.setXYZ(1,t.r,t.g,t.b),a.setXYZ(2,t.r,t.g,t.b),a.setXYZ(3,t.r,t.g,t.b),a.setXYZ(4,t.r,t.g,t.b),a.setXYZ(5,t.r,t.g,t.b),a.setXYZ(6,t.r,t.g,t.b),a.setXYZ(7,t.r,t.g,t.b),a.setXYZ(8,t.r,t.g,t.b),a.setXYZ(9,t.r,t.g,t.b),a.setXYZ(10,t.r,t.g,t.b),a.setXYZ(11,t.r,t.g,t.b),a.setXYZ(12,t.r,t.g,t.b),a.setXYZ(13,t.r,t.g,t.b),a.setXYZ(14,t.r,t.g,t.b),a.setXYZ(15,t.r,t.g,t.b),a.setXYZ(16,t.r,t.g,t.b),a.setXYZ(17,t.r,t.g,t.b),a.setXYZ(18,t.r,t.g,t.b),a.setXYZ(19,t.r,t.g,t.b),a.setXYZ(20,t.r,t.g,t.b),a.setXYZ(21,t.r,t.g,t.b),a.setXYZ(22,t.r,t.g,t.b),a.setXYZ(23,t.r,t.g,t.b),a.setXYZ(24,e.r,e.g,e.b),a.setXYZ(25,e.r,e.g,e.b),a.setXYZ(26,e.r,e.g,e.b),a.setXYZ(27,e.r,e.g,e.b),a.setXYZ(28,e.r,e.g,e.b),a.setXYZ(29,e.r,e.g,e.b),a.setXYZ(30,e.r,e.g,e.b),a.setXYZ(31,e.r,e.g,e.b),a.setXYZ(32,n.r,n.g,n.b),a.setXYZ(33,n.r,n.g,n.b),a.setXYZ(34,n.r,n.g,n.b),a.setXYZ(35,n.r,n.g,n.b),a.setXYZ(36,n.r,n.g,n.b),a.setXYZ(37,n.r,n.g,n.b),a.setXYZ(38,i.r,i.g,i.b),a.setXYZ(39,i.r,i.g,i.b),a.setXYZ(40,s.r,s.g,s.b),a.setXYZ(41,s.r,s.g,s.b),a.setXYZ(42,s.r,s.g,s.b),a.setXYZ(43,s.r,s.g,s.b),a.setXYZ(44,s.r,s.g,s.b),a.setXYZ(45,s.r,s.g,s.b),a.setXYZ(46,s.r,s.g,s.b),a.setXYZ(47,s.r,s.g,s.b),a.setXYZ(48,s.r,s.g,s.b),a.setXYZ(49,s.r,s.g,s.b),a.needsUpdate=!0,this}update(){let t=this.geometry,e=this.pointMap,n=1,i=1,s,r;if(be.projectionMatrixInverse.copy(this.camera.projectionMatrixInverse),this.camera.reversedDepth===!0)s=1,r=0;else if(this.camera.coordinateSystem===2000)s=-1,r=1;else if(this.camera.coordinateSystem===2001)s=0,r=1;else throw Error("THREE.CameraHelper.update(): Invalid coordinate system: "+this.camera.coordinateSystem);Ee("c",e,t,be,0,0,s),Ee("t",e,t,be,0,0,r),Ee("n1",e,t,be,-1,-1,s),Ee("n2",e,t,be,1,-1,s),Ee("n3",e,t,be,-1,1,s),Ee("n4",e,t,be,1,1,s),Ee("f1",e,t,be,-1,-1,r),Ee("f2",e,t,be,1,-1,r),Ee("f3",e,t,be,-1,1,r),Ee("f4",e,t,be,1,1,r),Ee("u1",e,t,be,0.7,1.1,s),Ee("u2",e,t,be,-0.7,1.1,s),Ee("u3",e,t,be,0,2,s),Ee("cf1",e,t,be,-1,0,r),Ee("cf2",e,t,be,1,0,r),Ee("cf3",e,t,be,0,-1,r),Ee("cf4",e,t,be,0,1,r),Ee("cn1",e,t,be,-1,0,s),Ee("cn2",e,t,be,1,0,s),Ee("cn3",e,t,be,0,-1,s),Ee("cn4",e,t,be,0,1,s),t.getAttribute("position").needsUpdate=!0}dispose(){super.dispose(),this.geometry.dispose(),this.material.dispose()}}function Ee(t,e,n,i,s,r,a){la.set(s,r,a).unproject(i);let o=e[t];if(o!==void 0){let l=n.getAttribute("position");for(let c=0,h=o.length;c<h;c++)l.setXYZ(o[c],la.x,la.y,la.z)}}var ca=new Fe;class ip extends vn{constructor(t,e=16776960){let n=new Uint16Array([0,1,1,2,2,3,3,0,4,5,5,6,6,7,7,4,0,4,1,5,2,6,3,7]),i=new Float32Array(24),s=new Wt;s.setIndex(new ce(n,1)),s.setAttribute("position",new ce(i,3));super(s,new He({color:e,toneMapped:!1}));this.object=t,this.type="BoxHelper",this.matrixAutoUpdate=!1,this.update()}update(){if(this.object!==void 0)ca.setFromObject(this.object);if(ca.isEmpty())return;let{min:t,max:e}=ca,n=this.geometry.attributes.position,i=n.array;i[0]=e.x,i[1]=e.y,i[2]=e.z,i[3]=t.x,i[4]=e.y,i[5]=e.z,i[6]=t.x,i[7]=t.y,i[8]=e.z,i[9]=e.x,i[10]=t.y,i[11]=e.z,i[12]=e.x,i[13]=e.y,i[14]=t.z,i[15]=t.x,i[16]=e.y,i[17]=t.z,i[18]=t.x,i[19]=t.y,i[20]=t.z,i[21]=e.x,i[22]=t.y,i[23]=t.z,n.needsUpdate=!0,this.geometry.computeBoundingSphere()}setFromObject(t){return this.object=t,this.update(),this}copy(t,e){return super.copy(t,e),this.object=t.object,this}dispose(){super.dispose(),this.geometry.dispose(),this.material.dispose()}}class sp extends vn{constructor(t,e=16776960){let n=new Uint16Array([0,1,1,2,2,3,3,0,4,5,5,6,6,7,7,4,0,4,1,5,2,6,3,7]),i=[1,1,1,-1,1,1,-1,-1,1,1,-1,1,1,1,-1,-1,1,-1,-1,-1,-1,1,-1,-1],s=new Wt;s.setIndex(new ce(n,1)),s.setAttribute("position",new Tt(i,3));super(s,new He({color:e,toneMapped:!1}));this.box=t,this.type="Box3Helper",this.geometry.computeBoundingSphere()}updateMatrixWorld(t){let e=this.box;if(e.isEmpty())return;e.getCenter(this.position),e.getSize(this.scale),this.scale.multiplyScalar(0.5),super.updateMatrixWorld(t)}dispose(){super.dispose(),this.geometry.dispose(),this.material.dispose()}}class rp extends Hn{constructor(t,e=1,n=16776960){let i=n,s=[1,-1,0,-1,1,0,-1,-1,0,1,1,0,-1,1,0,-1,-1,0,1,-1,0,1,1,0],r=new Wt;r.setAttribute("position",new Tt(s,3)),r.computeBoundingSphere();super(r,new He({color:i,toneMapped:!1}));this.type="PlaneHelper",this.plane=t,this.size=e;let a=[1,1,0,-1,1,0,-1,-1,0,1,1,0,-1,-1,0,1,-1,0],o=new Wt;o.setAttribute("position",new Tt(a,3)),o.computeBoundingSphere(),this.add(new Me(o,new xn({color:i,opacity:0.2,transparent:!0,depthWrite:!1,toneMapped:!1})))}updateMatrixWorld(t){this.position.set(0,0,0),this.scale.set(0.5*this.size,0.5*this.size,1),this.lookAt(this.plane.normal),this.translateZ(-this.plane.constant),super.updateMatrixWorld(t)}dispose(){super.dispose(),this.geometry.dispose(),this.material.dispose(),this.children[0].geometry.dispose(),this.children[0].material.dispose()}}var Ou=new R,ha,nl;class ap extends re{constructor(t=new R(0,0,1),e=new R(0,0,0),n=1,i=16776960,s=n*0.2,r=s*0.2){super();if(this.type="ArrowHelper",ha===void 0)ha=new Wt,ha.setAttribute("position",new Tt([0,0,0,0,1,0],3)),nl=new or(0.5,1,5,1),nl.translate(0,-0.5,0);this.position.copy(e),this.line=new Hn(ha,new He({color:i,toneMapped:!1})),this.line.matrixAutoUpdate=!1,this.add(this.line),this.cone=new Me(nl,new xn({color:i,toneMapped:!1})),this.cone.matrixAutoUpdate=!1,this.add(this.cone),this.setDirection(t),this.setLength(n,s,r)}setDirection(t){if(t.y>0.99999)this.quaternion.set(0,0,0,1);else if(t.y<-0.99999)this.quaternion.set(1,0,0,0);else{Ou.set(t.z,0,-t.x).normalize();let e=Math.acos(t.y);this.quaternion.setFromAxisAngle(Ou,e)}}setLength(t,e=t*0.2,n=e*0.2){this.line.scale.set(1,Math.max(0.0001,t-e),1),this.line.updateMatrix(),this.cone.scale.set(n,e,n),this.cone.position.y=t,this.cone.updateMatrix()}setColor(t){this.line.material.color.set(t),this.cone.material.color.set(t)}copy(t){return super.copy(t,!1),this.line.copy(t.line),this.cone.copy(t.cone),this}dispose(){super.dispose(),this.line.geometry.dispose(),this.line.material.dispose(),this.cone.geometry.dispose(),this.cone.material.dispose()}}class op extends vn{constructor(t=1){let e=[0,0,0,t,0,0,0,0,0,0,t,0,0,0,0,0,0,t],n=[1,0,0,1,0.6,0,0,1,0,0.6,1,0,0,0,1,0,0.6,1],i=new Wt;i.setAttribute("position",new Tt(e,3)),i.setAttribute("color",new Tt(n,3));let s=new He({vertexColors:!0,toneMapped:!1});super(i,s);this.type="AxesHelper"}setColors(t,e,n){let i=new _t,s=this.geometry.attributes.color.array;return i.set(t),i.toArray(s,0),i.toArray(s,3),i.set(e),i.toArray(s,6),i.toArray(s,9),i.set(n),i.toArray(s,12),i.toArray(s,15),this.geometry.attributes.color.needsUpdate=!0,this}dispose(){super.dispose(),this.geometry.dispose(),this.material.dispose()}}class lp{constructor(){this.type="ShapePath",this.color=new _t,this.subPaths=[],this.currentPath=null,this.userData={}}moveTo(t,e){return this.currentPath=new hs,this.subPaths.push(this.currentPath),this.currentPath.moveTo(t,e),this}lineTo(t,e){return this.currentPath.lineTo(t,e),this}quadraticCurveTo(t,e,n,i){return this.currentPath.quadraticCurveTo(t,e,n,i),this}bezierCurveTo(t,e,n,i,s,r){return this.currentPath.bezierCurveTo(t,e,n,i,s,r),this}splineThru(t){return this.currentPath.splineThru(t),this}toShapes(){function t(o,l){let c=!1,h=l.length;for(let d=0,u=h-1;d<h;u=d++){let f=l[d],m=l[u];if(f.y>o.y!==m.y>o.y&&o.x<(m.x-f.x)*(o.y-f.y)/(m.y-f.y)+f.x)c=!c}return c}function e(o,l){let c=l.getCenter(new j);if(t(c,o))return c;let h=c.y,d=[],u=o.length;for(let f=0;f<u;f++){let m=o[f],_=o[(f+1)%u];if(m.y>h!==_.y>h){let g=m.x+(h-m.y)*(_.x-m.x)/(_.y-m.y);d.push(g)}}if(d.length>1)d.sort((f,m)=>f-m),c.x=(d[0]+d[1])/2;return c}let n=this.userData.style&&this.userData.style.fillRule||"nonzero";if(n!=="nonzero"&&n!=="evenodd")dt('Fill-rule "'+n+'" is not supported, falling back to "nonzero".'),n="nonzero";let i=n==="nonzero"?(o)=>o!==0:(o)=>(o&1)!==0,s=[];for(let o of this.subPaths){let l=o.getPoints();if(l.length<3)continue;let c=pn.area(l);if(c===0)continue;let h=new sh;for(let d=0;d<l.length;d++)h.expandByPoint(l[d]);s.push({subPath:o,points:l,boundingBox:h,interiorPoint:e(l,h),absArea:Math.abs(c),winding:c<0?-1:1,container:null,exclude:!1,role:null})}s.sort((o,l)=>l.absArea-o.absArea);for(let o=0;o<s.length;o++){let l=s[o],c=0;for(let h=o-1;h>=0;h--){let d=s[h];if(!d.boundingBox.containsBox(l.boundingBox))continue;if(!t(l.interiorPoint,d.points))continue;l.container=d.exclude?d.container:d,c=d.winding,l.winding+=c;break}if(i(l.winding)===i(c))l.exclude=!0}for(let o of s){if(o.exclude)continue;o.role=o.container===null||o.container.role==="hole"?"outer":"hole"}let r=[],a=new Map;for(let o of s){if(o.exclude||o.role!=="outer")continue;let l=new Ss;l.curves=o.subPath.curves,r.push(l),a.set(o,l)}for(let o of s){if(o.exclude||o.role!=="hole")continue;let l=a.get(o.container);if(!l)continue;let c=new hs;c.curves=o.subPath.curves,l.holes.push(c)}return r}}class cp extends ln{constructor(t,e=null){super();this.object=t,this.domElement=e,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(t){if(this.domElement!==null)this.disconnect();this.domElement=t}disconnect(){}dispose(){}update(){}}function a0(t,e){let n=t.image&&t.image.width?t.image.width/t.image.height:1;if(n>e)t.repeat.x=1,t.repeat.y=n/e,t.offset.x=0,t.offset.y=(1-t.repeat.y)/2;else t.repeat.x=e/n,t.repeat.y=1,t.offset.x=(1-t.repeat.x)/2,t.offset.y=0;return t}function o0(t,e){let n=t.image&&t.image.width?t.image.width/t.image.height:1;if(n>e)t.repeat.x=e/n,t.repeat.y=1,t.offset.x=(1-t.repeat.x)/2,t.offset.y=0;else t.repeat.x=1,t.repeat.y=n/e,t.offset.x=0,t.offset.y=(1-t.repeat.y)/2;return t}function l0(t){return t.repeat.x=1,t.repeat.y=1,t.offset.x=0,t.offset.y=0,t}function fo(t,e,n,i){let s=c0(i);switch(n){case 1021:return t*e;case 1028:return t*e/s.components*s.byteLength;case 1029:return t*e/s.components*s.byteLength;case 1030:return t*e*2/s.components*s.byteLength;case 1031:return t*e*2/s.components*s.byteLength;case 1022:return t*e*3/s.components*s.byteLength;case 1023:return t*e*4/s.components*s.byteLength;case 1033:return t*e*4/s.components*s.byteLength;case 33776:case 33777:return Math.floor((t+3)/4)*Math.floor((e+3)/4)*8;case 33778:case 33779:return Math.floor((t+3)/4)*Math.floor((e+3)/4)*16;case 35841:case 35843:return Math.max(t,16)*Math.max(e,8)/4;case 35840:case 35842:return Math.max(t,8)*Math.max(e,8)/2;case 36196:case 37492:case 37488:case 37489:return Math.floor((t+3)/4)*Math.floor((e+3)/4)*8;case 37496:case 37490:case 37491:return Math.floor((t+3)/4)*Math.floor((e+3)/4)*16;case 37808:return Math.floor((t+3)/4)*Math.floor((e+3)/4)*16;case 37809:return Math.floor((t+4)/5)*Math.floor((e+3)/4)*16;case 37810:return Math.floor((t+4)/5)*Math.floor((e+4)/5)*16;case 37811:return Math.floor((t+5)/6)*Math.floor((e+4)/5)*16;case 37812:return Math.floor((t+5)/6)*Math.floor((e+5)/6)*16;case 37813:return Math.floor((t+7)/8)*Math.floor((e+4)/5)*16;case 37814:return Math.floor((t+7)/8)*Math.floor((e+5)/6)*16;case 37815:return Math.floor((t+7)/8)*Math.floor((e+7)/8)*16;case 37816:return Math.floor((t+9)/10)*Math.floor((e+4)/5)*16;case 37817:return Math.floor((t+9)/10)*Math.floor((e+5)/6)*16;case 37818:return Math.floor((t+9)/10)*Math.floor((e+7)/8)*16;case 37819:return Math.floor((t+9)/10)*Math.floor((e+9)/10)*16;case 37820:return Math.floor((t+11)/12)*Math.floor((e+9)/10)*16;case 37821:return Math.floor((t+11)/12)*Math.floor((e+11)/12)*16;case 36492:case 36494:case 36495:return Math.ceil(t/4)*Math.ceil(e/4)*16;case 36283:case 36284:return Math.ceil(t/4)*Math.ceil(e/4)*8;case 36285:case 36286:return Math.ceil(t/4)*Math.ceil(e/4)*16}throw Error(`Unable to determine texture byte length for ${n} format.`)}function c0(t){switch(t){case 1009:case 1010:return{byteLength:1,components:1};case 1012:case 1011:case 1016:return{byteLength:2,components:1};case 1017:case 1018:return{byteLength:2,components:4};case 1014:case 1013:case 1015:return{byteLength:4,components:1};case 35902:case 35899:return{byteLength:4,components:3}}throw Error(`THREE.TextureUtils: Unknown texture type ${t}.`)}class hp{static contain(t,e){return a0(t,e)}static cover(t,e){return o0(t,e)}static fill(t){return l0(t)}static getByteLength(t,e,n,i){return fo(t,e,n,i)}}if(typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"186"}}));if(typeof window<"u")if(window.__THREE__)dt("WARNING: Multiple instances of Three.js being imported.");else window.__THREE__="186";function Lp(){let t=null,e=!1,n=null,i=null;function s(r,a){i=t.requestAnimationFrame(s),n(r,a)}return{start:function(){if(e===!0)return;if(n===null)return;if(t===null)return;i=t.requestAnimationFrame(s),e=!0},stop:function(){if(t!==null)t.cancelAnimationFrame(i);e=!1},setAnimationLoop:function(r){n=r},setContext:function(r){t=r}}}function h0(t){let e=new WeakMap;function n(o,l){let{array:c,usage:h}=o,d=c.byteLength,u=t.createBuffer();t.bindBuffer(l,u),t.bufferData(l,c,h),o.onUploadCallback();let f;if(c instanceof Float32Array)f=t.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)f=t.HALF_FLOAT;else if(c instanceof Uint16Array)if(o.isFloat16BufferAttribute)f=t.HALF_FLOAT;else f=t.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=t.SHORT;else if(c instanceof Uint32Array)f=t.UNSIGNED_INT;else if(c instanceof Int32Array)f=t.INT;else if(c instanceof Int8Array)f=t.BYTE;else if(c instanceof Uint8Array)f=t.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=t.UNSIGNED_BYTE;else throw Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:u,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:o.version,size:d}}function i(o,l,c){let{array:h,updateRanges:d}=l;if(t.bindBuffer(c,o),d.length===0)t.bufferSubData(c,0,h);else{d.sort((f,m)=>f.start-m.start);let u=0;for(let f=1;f<d.length;f++){let m=d[u],_=d[f];if(_.start<=m.start+m.count+1)m.count=Math.max(m.count,_.start+_.count-m.start);else++u,d[u]=_}d.length=u+1;for(let f=0,m=d.length;f<m;f++){let _=d[f];t.bufferSubData(c,_.start*h.BYTES_PER_ELEMENT,h,_.start,_.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(o){if(o.isInterleavedBufferAttribute)o=o.data;return e.get(o)}function r(o){if(o.isInterleavedBufferAttribute)o=o.data;let l=e.get(o);if(l)t.deleteBuffer(l.buffer),e.delete(o)}function a(o,l){if(o.isInterleavedBufferAttribute)o=o.data;if(o.isGLBufferAttribute){let h=e.get(o);if(!h||h.version<o.version)e.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}let c=e.get(o);if(c===void 0)e.set(o,n(o,l));else if(c.version<o.version){if(c.size!==o.array.byteLength)throw Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(c.buffer,o,l),c.version=o.version}}return{get:s,remove:r,update:a}}var u0=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,d0=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,f0=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,p0=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,m0=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,g0=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,_0=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,x0=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,v0=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,y0=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,S0=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,M0=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,b0=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,T0=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,E0=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,A0=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,w0=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,C0=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,R0=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,I0=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,P0=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,L0=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,N0=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,U0=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,D0=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,F0=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,O0=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,B0=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,z0=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,G0=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,k0="gl_FragColor = linearToOutputTexel( gl_FragColor );",H0=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,V0=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,W0=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,X0=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,q0=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Y0=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Z0=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,J0=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,$0=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,K0=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Q0=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,j0=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,tx=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,ex=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,nx=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,ix=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureCubeUV( envMap, envMapRotation * retroVec, roughness );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_CUBE_UV
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,sx=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,rx=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,ax=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,ox=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,lx=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,cx=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,hx=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,ux=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,dx=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,fx=`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,px=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,mx=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,gx=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,_x=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,xx=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,vx=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,yx=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,Sx=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Mx=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,bx=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Tx=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Ex=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Ax=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,wx=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,Cx=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Rx=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Ix=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,Px=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Lx=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Nx=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,Ux=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Dx=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Fx=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Ox=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Bx=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,zx=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Gx=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,kx=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Hx=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Vx=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Wx=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Xx=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,qx=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Yx=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,Zx=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Jx=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,$x=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,Kx=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Qx=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,jx=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,tv=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,ev=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,nv=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,iv=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,sv=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,rv=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,av=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,ov=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,lv=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,cv=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`;var hv=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,uv=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,dv=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,fv=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,pv=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,mv=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,gv=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,_v=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,xv=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,vv=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,yv=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,Sv=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Mv=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,bv=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Tv=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Ev=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,Av=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,wv=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Cv=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Rv=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Iv=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Pv=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Lv=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Nv=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Uv=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Dv=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Fv=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Ov=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Bv=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,zv=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Gv=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,kv=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Hv=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Vv=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Wv=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Qt={alphahash_fragment:u0,alphahash_pars_fragment:d0,alphamap_fragment:f0,alphamap_pars_fragment:p0,alphatest_fragment:m0,alphatest_pars_fragment:g0,aomap_fragment:_0,aomap_pars_fragment:x0,batching_pars_vertex:v0,batching_vertex:y0,begin_vertex:S0,beginnormal_vertex:M0,bsdfs:b0,iridescence_fragment:T0,bumpmap_pars_fragment:E0,clipping_planes_fragment:A0,clipping_planes_pars_fragment:w0,clipping_planes_pars_vertex:C0,clipping_planes_vertex:R0,color_fragment:I0,color_pars_fragment:P0,color_pars_vertex:L0,color_vertex:N0,common:U0,cube_uv_reflection_fragment:D0,defaultnormal_vertex:F0,displacementmap_pars_vertex:O0,displacementmap_vertex:B0,emissivemap_fragment:z0,emissivemap_pars_fragment:G0,colorspace_fragment:k0,colorspace_pars_fragment:H0,envmap_fragment:V0,envmap_common_pars_fragment:W0,envmap_pars_fragment:X0,envmap_pars_vertex:q0,envmap_physical_pars_fragment:ix,envmap_vertex:Y0,fog_vertex:Z0,fog_pars_vertex:J0,fog_fragment:$0,fog_pars_fragment:K0,gradientmap_pars_fragment:Q0,lightmap_pars_fragment:j0,lights_lambert_fragment:tx,lights_lambert_pars_fragment:ex,lights_pars_begin:nx,lights_toon_fragment:sx,lights_toon_pars_fragment:rx,lights_phong_fragment:ax,lights_phong_pars_fragment:ox,lights_physical_fragment:lx,lights_physical_pars_fragment:cx,lights_fragment_begin:hx,lights_fragment_maps:ux,lights_fragment_end:dx,lightprobes_pars_fragment:fx,logdepthbuf_fragment:px,logdepthbuf_pars_fragment:mx,logdepthbuf_pars_vertex:gx,logdepthbuf_vertex:_x,map_fragment:xx,map_pars_fragment:vx,map_particle_fragment:yx,map_particle_pars_fragment:Sx,metalnessmap_fragment:Mx,metalnessmap_pars_fragment:bx,morphinstance_vertex:Tx,morphcolor_vertex:Ex,morphnormal_vertex:Ax,morphtarget_pars_vertex:wx,morphtarget_vertex:Cx,normal_fragment_begin:Rx,normal_fragment_maps:Ix,normal_pars_fragment:Px,normal_pars_vertex:Lx,normal_vertex:Nx,normalmap_pars_fragment:Ux,clearcoat_normal_fragment_begin:Dx,clearcoat_normal_fragment_maps:Fx,clearcoat_pars_fragment:Ox,iridescence_pars_fragment:Bx,opaque_fragment:zx,packing:Gx,premultiplied_alpha_fragment:kx,project_vertex:Hx,dithering_fragment:Vx,dithering_pars_fragment:Wx,roughnessmap_fragment:Xx,roughnessmap_pars_fragment:qx,shadowmap_pars_fragment:Yx,shadowmap_pars_vertex:Zx,shadowmap_vertex:Jx,shadowmask_pars_fragment:$x,skinbase_vertex:Kx,skinning_pars_vertex:Qx,skinning_vertex:jx,skinnormal_vertex:tv,specularmap_fragment:ev,specularmap_pars_fragment:nv,tonemapping_fragment:iv,tonemapping_pars_fragment:sv,transmission_fragment:rv,transmission_pars_fragment:av,uv_pars_fragment:ov,uv_pars_vertex:lv,uv_vertex:cv,worldpos_vertex:hv,background_vert:uv,background_frag:dv,backgroundCube_vert:fv,backgroundCube_frag:pv,cube_vert:mv,cube_frag:gv,depth_vert:_v,depth_frag:xv,distance_vert:vv,distance_frag:yv,equirect_vert:Sv,equirect_frag:Mv,linedashed_vert:bv,linedashed_frag:Tv,meshbasic_vert:Ev,meshbasic_frag:Av,meshlambert_vert:wv,meshlambert_frag:Cv,meshmatcap_vert:Rv,meshmatcap_frag:Iv,meshnormal_vert:Pv,meshnormal_frag:Lv,meshphong_vert:Nv,meshphong_frag:Uv,meshphysical_vert:Dv,meshphysical_frag:Fv,meshtoon_vert:Ov,meshtoon_frag:Bv,points_vert:zv,points_frag:Gv,shadow_vert:kv,shadow_frag:Hv,sprite_vert:Vv,sprite_frag:Wv},xt={common:{diffuse:{value:new _t(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Xt},alphaMap:{value:null},alphaMapTransform:{value:new Xt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Xt}},envmap:{envMap:{value:null},envMapRotation:{value:new Xt},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:0.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Xt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Xt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Xt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Xt},normalScale:{value:new j(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Xt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Xt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Xt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Xt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:0.00025},fogNear:{value:1},fogFar:{value:2000},fogColor:{value:new _t(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new R},probesMax:{value:new R},probesResolution:{value:new R}},points:{diffuse:{value:new _t(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Xt},alphaTest:{value:0},uvTransform:{value:new Xt}},sprite:{diffuse:{value:new _t(16777215)},opacity:{value:1},center:{value:new j(0.5,0.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Xt},alphaMap:{value:null},alphaMapTransform:{value:new Xt},alphaTest:{value:0}}},Pn={basic:{uniforms:Ve([xt.common,xt.specularmap,xt.envmap,xt.aomap,xt.lightmap,xt.fog]),vertexShader:Qt.meshbasic_vert,fragmentShader:Qt.meshbasic_frag},lambert:{uniforms:Ve([xt.common,xt.specularmap,xt.envmap,xt.aomap,xt.lightmap,xt.emissivemap,xt.bumpmap,xt.normalmap,xt.displacementmap,xt.fog,xt.lights,{emissive:{value:new _t(0)},envMapIntensity:{value:1}}]),vertexShader:Qt.meshlambert_vert,fragmentShader:Qt.meshlambert_frag},phong:{uniforms:Ve([xt.common,xt.specularmap,xt.envmap,xt.aomap,xt.lightmap,xt.emissivemap,xt.bumpmap,xt.normalmap,xt.displacementmap,xt.fog,xt.lights,{emissive:{value:new _t(0)},specular:{value:new _t(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Qt.meshphong_vert,fragmentShader:Qt.meshphong_frag},standard:{uniforms:Ve([xt.common,xt.envmap,xt.aomap,xt.lightmap,xt.emissivemap,xt.bumpmap,xt.normalmap,xt.displacementmap,xt.roughnessmap,xt.metalnessmap,xt.fog,xt.lights,{emissive:{value:new _t(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Qt.meshphysical_vert,fragmentShader:Qt.meshphysical_frag},toon:{uniforms:Ve([xt.common,xt.aomap,xt.lightmap,xt.emissivemap,xt.bumpmap,xt.normalmap,xt.displacementmap,xt.gradientmap,xt.fog,xt.lights,{emissive:{value:new _t(0)}}]),vertexShader:Qt.meshtoon_vert,fragmentShader:Qt.meshtoon_frag},matcap:{uniforms:Ve([xt.common,xt.bumpmap,xt.normalmap,xt.displacementmap,xt.fog,{matcap:{value:null}}]),vertexShader:Qt.meshmatcap_vert,fragmentShader:Qt.meshmatcap_frag},points:{uniforms:Ve([xt.points,xt.fog]),vertexShader:Qt.points_vert,fragmentShader:Qt.points_frag},dashed:{uniforms:Ve([xt.common,xt.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Qt.linedashed_vert,fragmentShader:Qt.linedashed_frag},depth:{uniforms:Ve([xt.common,xt.displacementmap]),vertexShader:Qt.depth_vert,fragmentShader:Qt.depth_frag},normal:{uniforms:Ve([xt.common,xt.bumpmap,xt.normalmap,xt.displacementmap,{opacity:{value:1}}]),vertexShader:Qt.meshnormal_vert,fragmentShader:Qt.meshnormal_frag},sprite:{uniforms:Ve([xt.sprite,xt.fog]),vertexShader:Qt.sprite_vert,fragmentShader:Qt.sprite_frag},background:{uniforms:{uvTransform:{value:new Xt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Qt.background_vert,fragmentShader:Qt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Xt}},vertexShader:Qt.backgroundCube_vert,fragmentShader:Qt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Qt.cube_vert,fragmentShader:Qt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Qt.equirect_vert,fragmentShader:Qt.equirect_frag},distance:{uniforms:Ve([xt.common,xt.displacementmap,{referencePosition:{value:new R},nearDistance:{value:1},farDistance:{value:1000}}]),vertexShader:Qt.distance_vert,fragmentShader:Qt.distance_frag},shadow:{uniforms:Ve([xt.lights,xt.fog,{color:{value:new _t(0)},opacity:{value:1}}]),vertexShader:Qt.shadow_vert,fragmentShader:Qt.shadow_frag}};Pn.physical={uniforms:Ve([Pn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Xt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Xt},clearcoatNormalScale:{value:new j(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Xt},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Xt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Xt},sheen:{value:0},sheenColor:{value:new _t(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Xt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Xt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Xt},transmissionSamplerSize:{value:new j},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Xt},attenuationDistance:{value:0},attenuationColor:{value:new _t(0)},specularColor:{value:new _t(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Xt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Xt},anisotropyVector:{value:new j},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Xt}}]),vertexShader:Qt.meshphysical_vert,fragmentShader:Qt.meshphysical_frag};var po={r:0,b:0,g:0},Xv=new Vt,Np=new Xt;Np.set(-1,0,0,0,1,0,0,0,1);function qv(t,e,n,i,s,r){let a=new _t(0),o=s===!0?0:1,l,c,h=null,d=0,u=null;function f(S){let E=S.isScene===!0?S.background:null;if(E&&E.isTexture){let x=S.backgroundBlurriness>0;E=e.get(E,x)}return E}function m(S){let E=!1,x=f(S);if(x===null)g(a,o);else if(x&&x.isColor)g(x,1),E=!0;let T=t.xr.getEnvironmentBlendMode();if(T==="additive")n.buffers.color.setClear(0,0,0,1,r);else if(T==="alpha-blend")n.buffers.color.setClear(0,0,0,0,r);if(t.autoClear||E)n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil)}function _(S,E){let x=f(E);if(x&&(x.isCubeTexture||x.mapping===Qs)){if(c===void 0)c=new Me(new Di(1,1,1),new De({name:"BackgroundCubeMaterial",uniforms:Fi(Pn.backgroundCube.uniforms),vertexShader:Pn.backgroundCube.vertexShader,fragmentShader:Pn.backgroundCube.fragmentShader,side:Ke,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(T,C,w){this.matrixWorld.copyPosition(w.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(c);if(c.material.uniforms.envMap.value=x,c.material.uniforms.backgroundBlurriness.value=E.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=E.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(Xv.makeRotationFromEuler(E.backgroundRotation)).transpose(),x.isCubeTexture&&x.isRenderTargetTexture===!1)c.material.uniforms.backgroundRotation.value.premultiply(Np);if(c.material.toneMapped=ne.getTransfer(x.colorSpace)!==ge,h!==x||d!==x.version||u!==t.toneMapping)c.material.needsUpdate=!0,h=x,d=x.version,u=t.toneMapping;c.layers.enableAll(),S.unshift(c,c.geometry,c.material,0,0,null)}else if(x&&x.isTexture){if(l===void 0)l=new Me(new Ms(2,2),new De({name:"BackgroundMaterial",uniforms:Fi(Pn.background.uniforms),vertexShader:Pn.background.vertexShader,fragmentShader:Pn.background.fragmentShader,side:ms,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(l);if(l.material.uniforms.t2D.value=x,l.material.uniforms.backgroundIntensity.value=E.backgroundIntensity,l.material.toneMapped=ne.getTransfer(x.colorSpace)!==ge,x.matrixAutoUpdate===!0)x.updateMatrix();if(l.material.uniforms.uvTransform.value.copy(x.matrix),h!==x||d!==x.version||u!==t.toneMapping)l.material.needsUpdate=!0,h=x,d=x.version,u=t.toneMapping;l.layers.enableAll(),S.unshift(l,l.geometry,l.material,0,0,null)}}function g(S,E){S.getRGB(po,wc(t)),n.buffers.color.setClear(po.r,po.g,po.b,E,r)}function p(){if(c!==void 0)c.geometry.dispose(),c.material.dispose(),c=void 0;if(l!==void 0)l.geometry.dispose(),l.material.dispose(),l=void 0}return{getClearColor:function(){return a},setClearColor:function(S,E=1){a.set(S),o=E,g(a,o)},getClearAlpha:function(){return o},setClearAlpha:function(S){o=S,g(a,o)},render:m,addToRenderList:_,dispose:p}}function Yv(t,e){let n=t.getParameter(t.MAX_VERTEX_ATTRIBS),i={},s=u(null),r=s,a=!1;function o(L,F,Z,P,G){let J=!1,k=d(L,P,Z,F);if(r!==k)r=k,c(r.object);if(J=f(L,P,Z,G),J)m(L,P,Z,G);if(G!==null)e.update(G,t.ELEMENT_ARRAY_BUFFER);if(J||a){if(a=!1,x(L,F,Z,P),G!==null)t.bindBuffer(t.ELEMENT_ARRAY_BUFFER,e.get(G).buffer)}}function l(){return t.createVertexArray()}function c(L){return t.bindVertexArray(L)}function h(L){return t.deleteVertexArray(L)}function d(L,F,Z,P){let G=P.wireframe===!0,J=i[F.id];if(J===void 0)J={},i[F.id]=J;let k=L.isInstancedMesh===!0?L.id:0,at=J[k];if(at===void 0)at={},J[k]=at;let W=at[Z.id];if(W===void 0)W={},at[Z.id]=W;let Q=W[G];if(Q===void 0)Q=u(l()),W[G]=Q;return Q}function u(L){let F=[],Z=[],P=[];for(let G=0;G<n;G++)F[G]=0,Z[G]=0,P[G]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:F,enabledAttributes:Z,attributeDivisors:P,object:L,attributes:{},index:null}}function f(L,F,Z,P){let G=r.attributes,J=F.attributes,k=0,at=Z.getAttributes();for(let W in at)if(at[W].location>=0){let it=G[W],Dt=J[W];if(Dt===void 0){if(W==="instanceMatrix"&&L.instanceMatrix)Dt=L.instanceMatrix;if(W==="instanceColor"&&L.instanceColor)Dt=L.instanceColor}if(it===void 0)return!0;if(it.attribute!==Dt)return!0;if(Dt&&it.data!==Dt.data)return!0;k++}if(r.attributesNum!==k)return!0;if(r.index!==P)return!0;return!1}function m(L,F,Z,P){let G={},J=F.attributes,k=0,at=Z.getAttributes();for(let W in at)if(at[W].location>=0){let it=J[W];if(it===void 0){if(W==="instanceMatrix"&&L.instanceMatrix)it=L.instanceMatrix;if(W==="instanceColor"&&L.instanceColor)it=L.instanceColor}let Dt={};if(Dt.attribute=it,it&&it.data)Dt.data=it.data;G[W]=Dt,k++}r.attributes=G,r.attributesNum=k,r.index=P}function _(){let L=r.newAttributes;for(let F=0,Z=L.length;F<Z;F++)L[F]=0}function g(L){p(L,0)}function p(L,F){let Z=r.newAttributes,P=r.enabledAttributes,G=r.attributeDivisors;if(Z[L]=1,P[L]===0)t.enableVertexAttribArray(L),P[L]=1;if(G[L]!==F)t.vertexAttribDivisor(L,F),G[L]=F}function S(){let L=r.newAttributes,F=r.enabledAttributes;for(let Z=0,P=F.length;Z<P;Z++)if(F[Z]!==L[Z])t.disableVertexAttribArray(Z),F[Z]=0}function E(L,F,Z,P,G,J,k){if(k===!0)t.vertexAttribIPointer(L,F,Z,G,J);else t.vertexAttribPointer(L,F,Z,P,G,J)}function x(L,F,Z,P){_();let G=P.attributes,J=Z.getAttributes(),k=F.defaultAttributeValues;for(let at in J){let W=J[at];if(W.location>=0){let Q=G[at];if(Q===void 0){if(at==="instanceMatrix"&&L.instanceMatrix)Q=L.instanceMatrix;if(at==="instanceColor"&&L.instanceColor)Q=L.instanceColor}if(Q!==void 0){let it=Q.normalized,Dt=Q.itemSize,Ft=e.get(Q);if(Ft===void 0)continue;let{buffer:he,type:$t,bytesPerElement:q}=Ft,lt=$t===t.INT||$t===t.UNSIGNED_INT||Q.gpuType===vl;if(Q.isInterleavedBufferAttribute){let rt=Q.data,Ot=rt.stride,Gt=Q.offset;if(rt.isInstancedInterleavedBuffer){for(let Ct=0;Ct<W.locationSize;Ct++)p(W.location+Ct,rt.meshPerAttribute);if(L.isInstancedMesh!==!0&&P._maxInstanceCount===void 0)P._maxInstanceCount=rt.meshPerAttribute*rt.count}else for(let Ct=0;Ct<W.locationSize;Ct++)g(W.location+Ct);t.bindBuffer(t.ARRAY_BUFFER,he);for(let Ct=0;Ct<W.locationSize;Ct++)E(W.location+Ct,Dt/W.locationSize,$t,it,Ot*q,(Gt+Dt/W.locationSize*Ct)*q,lt)}else{if(Q.isInstancedBufferAttribute){for(let rt=0;rt<W.locationSize;rt++)p(W.location+rt,Q.meshPerAttribute);if(L.isInstancedMesh!==!0&&P._maxInstanceCount===void 0)P._maxInstanceCount=Q.meshPerAttribute*Q.count}else for(let rt=0;rt<W.locationSize;rt++)g(W.location+rt);t.bindBuffer(t.ARRAY_BUFFER,he);for(let rt=0;rt<W.locationSize;rt++)E(W.location+rt,Dt/W.locationSize,$t,it,Dt*q,Dt/W.locationSize*rt*q,lt)}}else if(k!==void 0){let it=k[at];if(it!==void 0)switch(it.length){case 2:t.vertexAttrib2fv(W.location,it);break;case 3:t.vertexAttrib3fv(W.location,it);break;case 4:t.vertexAttrib4fv(W.location,it);break;default:t.vertexAttrib1fv(W.location,it)}}}}S()}function T(){b();for(let L in i){let F=i[L];for(let Z in F){let P=F[Z];for(let G in P){let J=P[G];for(let k in J)h(J[k].object),delete J[k];delete P[G]}}delete i[L]}}function C(L){if(i[L.id]===void 0)return;let F=i[L.id];for(let Z in F){let P=F[Z];for(let G in P){let J=P[G];for(let k in J)h(J[k].object),delete J[k];delete P[G]}}delete i[L.id]}function w(L){for(let F in i){let Z=i[F];for(let P in Z){let G=Z[P];if(G[L.id]===void 0)continue;let J=G[L.id];for(let k in J)h(J[k].object),delete J[k];delete G[L.id]}}}function v(L){for(let F in i){let Z=i[F],P=L.isInstancedMesh===!0?L.id:0,G=Z[P];if(G===void 0)continue;for(let J in G){let k=G[J];for(let at in k)h(k[at].object),delete k[at];delete G[J]}if(delete Z[P],Object.keys(Z).length===0)delete i[F]}}function b(){if(O(),a=!0,r===s)return;r=s,c(r.object)}function O(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:o,reset:b,resetDefaultState:O,dispose:T,releaseStatesOfGeometry:C,releaseStatesOfObject:v,releaseStatesOfProgram:w,initAttributes:_,enableAttribute:g,disableUnusedAttributes:S}}function Zv(t,e,n){let i;function s(l){i=l}function r(l,c){t.drawArrays(i,l,c),n.update(c,i,1)}function a(l,c,h){if(h===0)return;t.drawArraysInstanced(i,l,c,h),n.update(c,i,h)}function o(l,c,h){if(h===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,l,0,c,0,h);let u=0;for(let f=0;f<h;f++)u+=c[f];n.update(u,i,1)}this.setMode=s,this.render=r,this.renderInstances=a,this.renderMultiDraw=o}function Jv(t,e,n,i){let s;function r(){if(s!==void 0)return s;if(e.has("EXT_texture_filter_anisotropic")===!0){let w=e.get("EXT_texture_filter_anisotropic");s=t.getParameter(w.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function a(w){if(w!==Rn&&i.convert(w)!==t.getParameter(t.IMPLEMENTATION_COLOR_READ_FORMAT))return!1;return!0}function o(w){let v=w===je&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));if(w!==_n&&w!==Vn&&!v&&i.convert(w)!==t.getParameter(t.IMPLEMENTATION_COLOR_READ_TYPE))return!1;return!0}function l(w){if(w==="highp"){if(t.getShaderPrecisionFormat(t.VERTEX_SHADER,t.HIGH_FLOAT).precision>0&&t.getShaderPrecisionFormat(t.FRAGMENT_SHADER,t.HIGH_FLOAT).precision>0)return"highp";w="mediump"}if(w==="mediump"){if(t.getShaderPrecisionFormat(t.VERTEX_SHADER,t.MEDIUM_FLOAT).precision>0&&t.getShaderPrecisionFormat(t.FRAGMENT_SHADER,t.MEDIUM_FLOAT).precision>0)return"mediump"}return"lowp"}let c=n.precision!==void 0?n.precision:"highp",h=l(c);if(h!==c)dt("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h;let d=n.logarithmicDepthBuffer===!0,u=n.reversedDepthBuffer===!0&&e.has("EXT_clip_control");if(n.reversedDepthBuffer===!0&&u===!1)dt("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let f=t.getParameter(t.MAX_TEXTURE_IMAGE_UNITS),m=t.getParameter(t.MAX_VERTEX_TEXTURE_IMAGE_UNITS),_=t.getParameter(t.MAX_TEXTURE_SIZE),g=t.getParameter(t.MAX_CUBE_MAP_TEXTURE_SIZE),p=t.getParameter(t.MAX_VERTEX_ATTRIBS),S=t.getParameter(t.MAX_VERTEX_UNIFORM_VECTORS),E=t.getParameter(t.MAX_VARYING_VECTORS),x=t.getParameter(t.MAX_FRAGMENT_UNIFORM_VECTORS),T=t.getParameter(t.MAX_SAMPLES),C=t.getParameter(t.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:a,textureTypeReadable:o,precision:c,logarithmicDepthBuffer:d,reversedDepthBuffer:u,maxTextures:f,maxVertexTextures:m,maxTextureSize:_,maxCubemapSize:g,maxAttributes:p,maxVertexUniforms:S,maxVaryings:E,maxFragmentUniforms:x,maxSamples:T,samples:C}}function $v(t){let e=this,n=null,i=0,s=!1,r=!1,a=new bn,o=new Xt,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(d,u){let f=d.length!==0||u||i!==0||s;return s=u,i=d.length,f},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(d,u){n=h(d,u,0)},this.setState=function(d,u,f){let{clippingPlanes:m,clipIntersection:_,clipShadows:g}=d,p=t.get(d);if(!s||m===null||m.length===0||r&&!g)if(r)h(null);else c();else{let S=r?0:i,E=S*4,x=p.clippingState||null;l.value=x,x=h(m,u,E,f);for(let T=0;T!==E;++T)x[T]=n[T];p.clippingState=x,this.numIntersection=_?this.numPlanes:0,this.numPlanes+=S}};function c(){if(l.value!==n)l.value=n,l.needsUpdate=i>0;e.numPlanes=i,e.numIntersection=0}function h(d,u,f,m){let _=d!==null?d.length:0,g=null;if(_!==0){if(g=l.value,m!==!0||g===null){let p=f+_*4,S=u.matrixWorldInverse;if(o.getNormalMatrix(S),g===null||g.length<p)g=new Float32Array(p);for(let E=0,x=f;E!==_;++E,x+=4)a.copy(d[E]).applyMatrix4(S,o),a.normal.toArray(g,x),g[x+3]=a.constant}l.value=g,l.needsUpdate=!0}return e.numPlanes=_,e.numIntersection=0,g}}var Ts=4,Kv=6,Qv=20,jv=256,gr=new ci,up=new _t,rh=null,ah=0,oh=0,lh=!1,ty=new R,Bi=new R;class uh{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(t,e=0,n=0.1,i=100,s={}){let{size:r=256,position:a=ty}=s;rh=this._renderer.getRenderTarget(),ah=this._renderer.getActiveCubeFace(),oh=this._renderer.getActiveMipmapLevel(),lh=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(r);let o=this._allocateTargets();if(o.depthBuffer=!0,this._sceneToCubeUV(t,n,i,o,a),e>0)this._blur(o,0,0,e);return this._applyPMREM(o),this._cleanup(o),o}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){if(this._cubemapMaterial===null)this._cubemapMaterial=pp(),this._compileMaterial(this._cubemapMaterial)}compileEquirectangularShader(){if(this._equirectMaterial===null)this._equirectMaterial=fp(),this._compileMaterial(this._equirectMaterial)}dispose(){if(this._dispose(),this._cubemapMaterial!==null)this._cubemapMaterial.dispose();if(this._equirectMaterial!==null)this._equirectMaterial.dispose();if(this._backgroundBox!==null)this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose()}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){if(this._blurMaterial!==null)this._blurMaterial.dispose();if(this._ggxMaterial!==null)this._ggxMaterial.dispose();if(this._pingPongRenderTarget!==null)this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodMeshes.length;t++)this._lodMeshes[t].geometry.dispose()}_cleanup(t){this._renderer.setRenderTarget(rh,ah,oh),this._renderer.xr.enabled=lh,t.scissorTest=!1,bs(t,0,0,t.width,t.height)}_fromTexture(t,e){if(t.mapping===_s||t.mapping===wi)this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width);else this._setSize(t.image.width/4);rh=this._renderer.getRenderTarget(),ah=this._renderer.getActiveCubeFace(),oh=this._renderer.getActiveMipmapLevel(),lh=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=e||this._allocateTargets();return this._textureToCubeUV(t,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,n={magFilter:Qe,minFilter:Qe,generateMipmaps:!1,type:je,format:Rn,colorSpace:nc,depthBuffer:!1},i=dp(t,e,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){if(this._pingPongRenderTarget!==null)this._dispose();this._pingPongRenderTarget=dp(t,e,n);let{_lodMax:s}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods}=ey(s)),this._blurMaterial=iy(s,t,e),this._ggxMaterial=ny(s,t,e)}return i}_compileMaterial(t){let e=new Me(new Wt,t);this._renderer.compile(e,gr)}_sceneToCubeUV(t,e,n,i,s){let o=new Le(90,1,e,n),l=[1,-1,1,1,1,1],c=[1,1,1,-1,-1,-1],h=this._renderer,{autoClear:d,toneMapping:u}=h;if(h.getClearColor(up),h.toneMapping=gn,h.autoClear=!1,h.state.buffers.depth.getReversed())h.setRenderTarget(i),h.clearDepth(),h.setRenderTarget(null);if(this._backgroundBox===null)this._backgroundBox=new Me(new Di,new xn({name:"PMREM.Background",side:Ke,depthWrite:!1,depthTest:!1}));let m=this._backgroundBox,_=m.material,g=!1,p=t.background;if(p){if(p.isColor)_.color.copy(p),t.background=null,g=!0}else _.color.copy(up),g=!0;for(let S=0;S<6;S++){let E=S%3;if(E===0)o.up.set(0,l[S],0),o.position.set(s.x,s.y,s.z),o.lookAt(s.x+c[S],s.y,s.z);else if(E===1)o.up.set(0,0,l[S]),o.position.set(s.x,s.y,s.z),o.lookAt(s.x,s.y+c[S],s.z);else o.up.set(0,l[S],0),o.position.set(s.x,s.y,s.z),o.lookAt(s.x,s.y,s.z+c[S]);let x=this._cubeSize;if(bs(i,E*x,S>2?x:0,x,x),h.setRenderTarget(i),g)h.render(m,o);h.render(t,o)}h.toneMapping=u,h.autoClear=d,t.background=p}_textureToCubeUV(t,e){let n=this._renderer,i=t.mapping===_s||t.mapping===wi;if(i){if(this._cubemapMaterial===null)this._cubemapMaterial=pp();this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1}else if(this._equirectMaterial===null)this._equirectMaterial=fp();let s=i?this._cubemapMaterial:this._equirectMaterial,r=this._lodMeshes[0];r.material=s;let a=s.uniforms;a.envMap.value=t;let o=this._cubeSize;bs(e,0,0,3*o,2*o),n.setRenderTarget(e),n.render(r,gr)}_applyPMREM(t){let e=this._renderer,n=e.autoClear;e.autoClear=!1;let i=this._lodMeshes.length;for(let s=1;s<i;s++)this._applyGGXFilter(t,s-1,s);e.autoClear=n}_applyGGXFilter(t,e,n){let i=this._renderer,s=this._pingPongRenderTarget,r=this._ggxMaterial,a=this._lodMeshes[n];a.material=r;let o=r.uniforms,l=n/(this._lodMeshes.length-1),c=e/(this._lodMeshes.length-1),h=Math.sqrt(l*l-c*c),d=l*1.25,u=h*d,{_lodMax:f}=this,m=this._sizeLods[n],_=3*m*(n>f-Ts?n-f+Ts:0),g=4*(this._cubeSize-m);o.envMap.value=t.texture,o.roughness.value=u,o.mipInt.value=f-e,bs(s,_,g,3*m,2*m),i.setRenderTarget(s),i.render(a,gr),o.envMap.value=s.texture,o.roughness.value=0,o.mipInt.value=f-n,bs(t,_,g,3*m,2*m),i.setRenderTarget(t),i.render(a,gr)}_blur(t,e,n,i){let s=this._pingPongRenderTarget,r=Math.min(i,Math.PI)/Math.SQRT2;this._blurPass(t,s,e,n,r),this._blurPass(s,t,n,n,r)}_blurPass(t,e,n,i,s){let r=this._renderer,a=this._blurMaterial,o=this._lodMeshes[i];o.material=a;let l=a.uniforms;l.envMap.value=t.texture,l.sigma.value=s,l.mipInt.value=this._lodMax-n;let c=this._sizeLods[i],h=3*c*(i>this._lodMax-Ts?i-this._lodMax+Ts:0),d=4*(this._cubeSize-c);bs(e,h,d,3*c,2*c),r.setRenderTarget(e),r.render(o,gr)}}function ey(t){let e=[],n=[],i=t,s=t-Ts+1+Kv;for(let r=0;r<s;r++){let a=Math.pow(2,i);e.push(a);let o=1/(a-2),l=-o,c=1+o,h=[l,l,c,l,c,c,l,l,c,c,l,c],d=6,u=6,f=3,m=new Float32Array(f*u*d),_=new Float32Array(f*u*d);for(let p=0;p<d;p++){let S=p%3*2/3-1,E=p>2?0:-1,x=[S,E,0,S+0.6666666666666666,E,0,S+0.6666666666666666,E+1,0,S,E,0,S+0.6666666666666666,E+1,0,S,E+1,0];m.set(x,f*u*p);for(let T=0;T<u;T++){let C=h[T*2]*2-1,w=h[T*2+1]*2-1;if(p===0)Bi.set(1,w,C);else if(p===1)Bi.set(-C,1,-w);else if(p===2)Bi.set(-C,w,1);else if(p===3)Bi.set(-1,w,-C);else if(p===4)Bi.set(-C,-1,w);else Bi.set(C,w,-1);Bi.toArray(_,(p*u+T)*f)}}let g=new Wt;if(g.setAttribute("position",new ce(m,f)),g.setAttribute("outputDirection",new ce(_,f)),n.push(new Me(g,null)),i>Ts)i--}return{lodMeshes:n,sizeLods:e}}function dp(t,e,n){let i=new Ce(t,e,n);return i.texture.mapping=Qs,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function bs(t,e,n,i,s){t.viewport.set(e,n,i,s),t.scissor.set(e,n,i,s)}function ny(t,e,n){return new De({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:jv,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${t}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:go(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:Cn,depthTest:!1,depthWrite:!1})}function iy(t,e,n){return new De({name:"SphericalGaussianBlur",defines:{SAMPLES:Qv,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${t}.0`},uniforms:{envMap:{value:null},sigma:{value:0},mipInt:{value:0}},vertexShader:go(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float sigma;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359
			#define GOLDEN_ANGLE 2.39996322973

			void main() {

				if ( sigma == 0.0 ) {

					gl_FragColor = vec4( bilinearCubeUV( envMap, vOutputDirection, mipInt ), 1.0 );
					return;

				}

				vec3 outputDirection = normalize( vOutputDirection );

				vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
				vec3 tangent = normalize( cross( up, outputDirection ) );
				vec3 bitangent = cross( outputDirection, tangent );

				// Truncate the kernel at three standard deviations or at the antipode.
				float thetaMax = min( 3.0 * sigma, PI );
				float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

				vec3 accumColor = vec3( 0.0 );
				float accumWeight = 0.0;

				for ( int i = 0; i < SAMPLES; i ++ ) {

					// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
					float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
					float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
					float phi = float( i ) * GOLDEN_ANGLE;

					vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
					vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

					// Correct the planar sample density to solid angle.
					float weight = sin( theta ) / theta;

					accumColor += weight * bilinearCubeUV( envMap, sampleDirection, mipInt );
					accumWeight += weight;

				}

				gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

			}
		`,blending:Cn,depthTest:!1,depthWrite:!1})}function fp(){return new De({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:go(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Cn,depthTest:!1,depthWrite:!1})}function pp(){return new De({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:go(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Cn,depthTest:!1,depthWrite:!1})}function go(){return`

		precision mediump float;
		precision mediump int;

		attribute vec3 outputDirection;

		varying vec3 vOutputDirection;

		void main() {

			vOutputDirection = outputDirection;
			gl_Position = vec4( position, 1.0 );

		}
	`}class ph extends Ce{constructor(t=1,e={}){super(t,t,e);this.isWebGLCubeRenderTarget=!0;let n={width:t,height:t,depth:1},i=[n,n,n,n,n,n];this.texture=new ys(i),this._setTextureOptions(e),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},i=new Di(5,5,5),s=new De({name:"CubemapFromEquirect",uniforms:Fi(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Ke,blending:Cn});s.uniforms.tEquirect.value=e;let r=new Me(i,s),a=e.minFilter;if(e.minFilter===Ci)e.minFilter=Qe;return new Zc(1,10,this).update(t,r),e.minFilter=a,r.geometry.dispose(),r.material.dispose(),this}clear(t,e=!0,n=!0,i=!0){let s=t.getRenderTarget();for(let r=0;r<6;r++)t.setRenderTarget(this,r),t.clear(e,n,i);t.setRenderTarget(s)}}function sy(t){let e=new WeakMap,n=new WeakMap,i=null;function s(u,f=!1){if(u===null||u===void 0)return null;if(f)return a(u);return r(u)}function r(u){if(u&&u.isTexture){let f=u.mapping;if(f===ma||f===ga)if(e.has(u)){let m=e.get(u).texture;return o(m,u.mapping)}else{let m=u.image;if(m&&m.height>0){let _=new ph(m.height);return _.fromEquirectangularTexture(t,u),e.set(u,_),u.addEventListener("dispose",c),o(_.texture,u.mapping)}else return null}}return u}function a(u){if(u&&u.isTexture){let f=u.mapping,m=f===ma||f===ga,_=f===_s||f===wi;if(m||_){let g=n.get(u),p=g!==void 0?g.texture.pmremVersion:0;if(u.isRenderTargetTexture&&u.pmremVersion!==p){if(i===null)i=new uh(t);return g=m?i.fromEquirectangular(u,g):i.fromCubemap(u,g),g.texture.pmremVersion=u.pmremVersion,n.set(u,g),g.texture}else if(g!==void 0)return g.texture;else{let S=u.image;if(m&&S&&S.height>0||_&&S&&l(S)){if(i===null)i=new uh(t);return g=m?i.fromEquirectangular(u):i.fromCubemap(u),g.texture.pmremVersion=u.pmremVersion,n.set(u,g),u.addEventListener("dispose",h),g.texture}else return null}}}return u}function o(u,f){if(f===ma)u.mapping=_s;else if(f===ga)u.mapping=wi;return u}function l(u){let f=0,m=6;for(let _=0;_<m;_++)if(u[_]!==void 0)f++;return f===m}function c(u){let f=u.target;f.removeEventListener("dispose",c);let m=e.get(f);if(m!==void 0)e.delete(f),m.dispose()}function h(u){let f=u.target;f.removeEventListener("dispose",h);let m=n.get(f);if(m!==void 0)n.delete(f),m.dispose()}function d(){if(e=new WeakMap,n=new WeakMap,i!==null)i.dispose(),i=null}return{get:s,dispose:d}}function ry(t){let e={};function n(i){if(e[i]!==void 0)return e[i];let s=t.getExtension(i);return e[i]=s,s}return{has:function(i){return n(i)!==null},init:function(){n("EXT_color_buffer_float"),n("WEBGL_clip_cull_distance"),n("OES_texture_float_linear"),n("EXT_color_buffer_half_float"),n("WEBGL_multisampled_render_to_texture"),n("WEBGL_render_shared_exponent")},get:function(i){let s=n(i);if(s===null)Gn("WebGLRenderer: "+i+" extension not supported.");return s}}}function ay(t,e,n,i){let s={},r=new WeakMap;function a(d){let u=d.target;if(u.index!==null)e.remove(u.index);for(let m in u.attributes)e.remove(u.attributes[m]);u.removeEventListener("dispose",a),delete s[u.id];let f=r.get(u);if(f)e.remove(f),r.delete(u);if(i.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0)delete u._maxInstanceCount;n.memory.geometries--}function o(d,u){if(s[u.id]===!0)return u;return u.addEventListener("dispose",a),s[u.id]=!0,n.memory.geometries++,u}function l(d){let u=d.attributes;for(let f in u)e.update(u[f],t.ARRAY_BUFFER)}function c(d){let u=[],f=d.index,m=d.attributes.position,_=0;if(m===void 0)return;if(f!==null){let S=f.array;_=f.version;for(let E=0,x=S.length;E<x;E+=3){let T=S[E+0],C=S[E+1],w=S[E+2];u.push(T,C,C,w,w,T)}}else{let S=m.array;_=m.version;for(let E=0,x=S.length/3-1;E<x;E+=3){let T=E+0,C=E+1,w=E+2;u.push(T,C,C,w,w,T)}}let g=new(m.count>=65535?Pa:Ia)(u,1);g.version=_;let p=r.get(d);if(p)e.remove(p);r.set(d,g)}function h(d){let u=r.get(d);if(u){let f=d.index;if(f!==null){if(u.version<f.version)c(d)}}else c(d);return r.get(d)}return{get:o,update:l,getWireframeAttribute:h}}function oy(t,e,n){let i;function s(d){i=d}let r,a;function o(d){r=d.type,a=d.bytesPerElement}function l(d,u){t.drawElements(i,u,r,d*a),n.update(u,i,1)}function c(d,u,f){if(f===0)return;t.drawElementsInstanced(i,u,r,d*a,f),n.update(u,i,f)}function h(d,u,f){if(f===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,u,0,r,d,0,f);let _=0;for(let g=0;g<f;g++)_+=u[g];n.update(_,i,1)}this.setMode=s,this.setIndex=o,this.render=l,this.renderInstances=c,this.renderMultiDraw=h}function ly(t){let e={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function i(r,a,o){switch(n.calls++,a){case t.TRIANGLES:n.triangles+=o*(r/3);break;case t.LINES:n.lines+=o*(r/2);break;case t.LINE_STRIP:n.lines+=o*(r-1);break;case t.LINE_LOOP:n.lines+=o*r;break;case t.POINTS:n.points+=o*r;break;default:Lt("WebGLInfo: Unknown draw mode:",a);break}}function s(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:e,render:n,programs:null,autoReset:!0,reset:s,update:i}}function cy(t,e,n){let i=new WeakMap,s=new de;function r(a,o,l){let c=a.morphTargetInfluences,h=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,d=h!==void 0?h.length:0,u=i.get(o);if(u===void 0||u.count!==d){let b=function(){w.dispose(),i.delete(o),o.removeEventListener("dispose",b)};if(u!==void 0)u.texture.dispose();let f=o.morphAttributes.position!==void 0,m=o.morphAttributes.normal!==void 0,_=o.morphAttributes.color!==void 0,g=o.morphAttributes.position||[],p=o.morphAttributes.normal||[],S=o.morphAttributes.color||[],E=0;if(f===!0)E=1;if(m===!0)E=2;if(_===!0)E=3;let x=o.attributes.position.count*E,T=1;if(x>e.maxTextureSize)T=Math.ceil(x/e.maxTextureSize),x=e.maxTextureSize;let C=new Float32Array(x*T*4*d),w=new er(C,x,T,d);w.type=Vn,w.needsUpdate=!0;let v=E*4;for(let O=0;O<d;O++){let L=g[O],F=p[O],Z=S[O],P=x*T*4*O;for(let G=0;G<L.count;G++){let J=G*v;if(f===!0)s.fromBufferAttribute(L,G),C[P+J+0]=s.x,C[P+J+1]=s.y,C[P+J+2]=s.z,C[P+J+3]=0;if(m===!0)s.fromBufferAttribute(F,G),C[P+J+4]=s.x,C[P+J+5]=s.y,C[P+J+6]=s.z,C[P+J+7]=0;if(_===!0)s.fromBufferAttribute(Z,G),C[P+J+8]=s.x,C[P+J+9]=s.y,C[P+J+10]=s.z,C[P+J+11]=Z.itemSize===4?s.w:1}}u={count:d,texture:w,size:new j(x,T)},i.set(o,u),o.addEventListener("dispose",b)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)l.getUniforms().setValue(t,"morphTexture",a.morphTexture,n);else{let f=0;for(let _=0;_<c.length;_++)f+=c[_];let m=o.morphTargetsRelative?1:1-f;l.getUniforms().setValue(t,"morphTargetBaseInfluence",m),l.getUniforms().setValue(t,"morphTargetInfluences",c)}l.getUniforms().setValue(t,"morphTargetsTexture",u.texture,n),l.getUniforms().setValue(t,"morphTargetsTextureSize",u.size)}return{update:r}}function hy(t,e,n,i,s){let r=new WeakMap;function a(c){let h=s.render.frame,d=c.geometry,u=e.get(c,d);if(r.get(u)!==h)e.update(u),r.set(u,h);if(c.isInstancedMesh){if(c.hasEventListener("dispose",l)===!1)c.addEventListener("dispose",l);if(r.get(c)!==h){if(n.update(c.instanceMatrix,t.ARRAY_BUFFER),c.instanceColor!==null)n.update(c.instanceColor,t.ARRAY_BUFFER);r.set(c,h)}}if(c.isSkinnedMesh){let f=c.skeleton;if(r.get(f)!==h)f.update(),r.set(f,h)}return u}function o(){r=new WeakMap}function l(c){let h=c.target;if(h.removeEventListener("dispose",l),i.releaseStatesOfObject(h),n.remove(h.instanceMatrix),h.instanceColor!==null)n.remove(h.instanceColor)}return{update:a,dispose:o}}var uy={[dl]:"LINEAR_TONE_MAPPING",[fl]:"REINHARD_TONE_MAPPING",[pl]:"CINEON_TONE_MAPPING",[ml]:"ACES_FILMIC_TONE_MAPPING",[_l]:"AGX_TONE_MAPPING",[xl]:"NEUTRAL_TONE_MAPPING",[gl]:"CUSTOM_TONE_MAPPING"};function dy(t,e,n,i,s,r){let a=new Ce(e,n,{type:t,depthBuffer:s,stencilBuffer:r,samples:i?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),o=null,l=null,c=new Wt;c.setAttribute("position",new Tt([-1,3,0,-1,-1,0,3,-1,0],3)),c.setAttribute("uv",new Tt([0,2,0,0,2,0],2));let h=new eo({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),d=new Me(c,h),u=new ci(-1,1,1,-1,0,1),f=null,m=null,_=!1,g,p=null,S=[],E=!1;this.setSize=function(x,T){if(a.setSize(x,T),o!==null)o.setSize(x,T);if(l!==null)l.setSize(x,T);for(let C=0;C<S.length;C++){let w=S[C];if(w.setSize)w.setSize(x,T)}},this.setEffects=function(x){S=x,E=S.length>0&&S[0].isRenderPass===!0;let{width:T,height:C}=a;if(S.length>0&&o===null)o=new Ce(T,C,{type:je,depthBuffer:!1,stencilBuffer:!1}),l=new Ce(T,C,{type:je,depthBuffer:!1,stencilBuffer:!1});for(let w=0;w<S.length;w++){let v=S[w];if(v.setSize)v.setSize(T,C)}},this.begin=function(x,T){if(_)return!1;if(x.toneMapping===gn&&S.length===0)return!1;if(p=T,T!==null){let{width:C,height:w}=T;if(a.width!==C||a.height!==w)this.setSize(C,w)}if(E===!1)x.setRenderTarget(a);return g=x.toneMapping,x.toneMapping=gn,!0},this.hasRenderPass=function(){return E},this.end=function(x,T){x.toneMapping=g,_=!0;let C=a,w=o;for(let v=0;v<S.length;v++){let b=S[v];if(b.enabled===!1)continue;if(b.render(x,w,C,T),b.needsSwap!==!1)C=w,w=w===o?l:o}if(f!==x.outputColorSpace||m!==x.toneMapping){if(f=x.outputColorSpace,m=x.toneMapping,h.defines={},ne.getTransfer(f)===ge)h.defines.SRGB_TRANSFER="";let v=uy[m];if(v)h.defines[v]="";h.needsUpdate=!0}h.uniforms.tDiffuse.value=C.texture,x.setRenderTarget(p),x.render(d,u),p=null,_=!1},this.isCompositing=function(){return _},this.dispose=function(){if(a.dispose(),o!==null)o.dispose();if(l!==null)l.dispose();c.dispose(),h.dispose()}}var Up=new Se,dh=new Ui(1,1),Dp=new er,Fp=new nr,Op=new ys,mp=[],gp=[],_p=new Float32Array(16),xp=new Float32Array(9),vp=new Float32Array(4);function Es(t,e,n){let i=t[0];if(i<=0||i>0)return t;let s=e*n,r=mp[s];if(r===void 0)r=new Float32Array(s),mp[s]=r;if(e!==0){i.toArray(r,0);for(let a=1,o=0;a!==e;++a)o+=n,t[a].toArray(r,o)}return r}function Re(t,e){if(t.length!==e.length)return!1;for(let n=0,i=t.length;n<i;n++)if(t[n]!==e[n])return!1;return!0}function Ie(t,e){for(let n=0,i=e.length;n<i;n++)t[n]=e[n]}function _o(t,e){let n=gp[e];if(n===void 0)n=new Int32Array(e),gp[e]=n;for(let i=0;i!==e;++i)n[i]=t.allocateTextureUnit();return n}function fy(t,e){let n=this.cache;if(n[0]===e)return;t.uniform1f(this.addr,e),n[0]=e}function py(t,e){let n=this.cache;if(e.x!==void 0){if(n[0]!==e.x||n[1]!==e.y)t.uniform2f(this.addr,e.x,e.y),n[0]=e.x,n[1]=e.y}else{if(Re(n,e))return;t.uniform2fv(this.addr,e),Ie(n,e)}}function my(t,e){let n=this.cache;if(e.x!==void 0){if(n[0]!==e.x||n[1]!==e.y||n[2]!==e.z)t.uniform3f(this.addr,e.x,e.y,e.z),n[0]=e.x,n[1]=e.y,n[2]=e.z}else if(e.r!==void 0){if(n[0]!==e.r||n[1]!==e.g||n[2]!==e.b)t.uniform3f(this.addr,e.r,e.g,e.b),n[0]=e.r,n[1]=e.g,n[2]=e.b}else{if(Re(n,e))return;t.uniform3fv(this.addr,e),Ie(n,e)}}function gy(t,e){let n=this.cache;if(e.x!==void 0){if(n[0]!==e.x||n[1]!==e.y||n[2]!==e.z||n[3]!==e.w)t.uniform4f(this.addr,e.x,e.y,e.z,e.w),n[0]=e.x,n[1]=e.y,n[2]=e.z,n[3]=e.w}else{if(Re(n,e))return;t.uniform4fv(this.addr,e),Ie(n,e)}}function _y(t,e){let n=this.cache,i=e.elements;if(i===void 0){if(Re(n,e))return;t.uniformMatrix2fv(this.addr,!1,e),Ie(n,e)}else{if(Re(n,i))return;vp.set(i),t.uniformMatrix2fv(this.addr,!1,vp),Ie(n,i)}}function xy(t,e){let n=this.cache,i=e.elements;if(i===void 0){if(Re(n,e))return;t.uniformMatrix3fv(this.addr,!1,e),Ie(n,e)}else{if(Re(n,i))return;xp.set(i),t.uniformMatrix3fv(this.addr,!1,xp),Ie(n,i)}}function vy(t,e){let n=this.cache,i=e.elements;if(i===void 0){if(Re(n,e))return;t.uniformMatrix4fv(this.addr,!1,e),Ie(n,e)}else{if(Re(n,i))return;_p.set(i),t.uniformMatrix4fv(this.addr,!1,_p),Ie(n,i)}}function yy(t,e){let n=this.cache;if(n[0]===e)return;t.uniform1i(this.addr,e),n[0]=e}function Sy(t,e){let n=this.cache;if(e.x!==void 0){if(n[0]!==e.x||n[1]!==e.y)t.uniform2i(this.addr,e.x,e.y),n[0]=e.x,n[1]=e.y}else{if(Re(n,e))return;t.uniform2iv(this.addr,e),Ie(n,e)}}function My(t,e){let n=this.cache;if(e.x!==void 0){if(n[0]!==e.x||n[1]!==e.y||n[2]!==e.z)t.uniform3i(this.addr,e.x,e.y,e.z),n[0]=e.x,n[1]=e.y,n[2]=e.z}else{if(Re(n,e))return;t.uniform3iv(this.addr,e),Ie(n,e)}}function by(t,e){let n=this.cache;if(e.x!==void 0){if(n[0]!==e.x||n[1]!==e.y||n[2]!==e.z||n[3]!==e.w)t.uniform4i(this.addr,e.x,e.y,e.z,e.w),n[0]=e.x,n[1]=e.y,n[2]=e.z,n[3]=e.w}else{if(Re(n,e))return;t.uniform4iv(this.addr,e),Ie(n,e)}}function Ty(t,e){let n=this.cache;if(n[0]===e)return;t.uniform1ui(this.addr,e),n[0]=e}function Ey(t,e){let n=this.cache;if(e.x!==void 0){if(n[0]!==e.x||n[1]!==e.y)t.uniform2ui(this.addr,e.x,e.y),n[0]=e.x,n[1]=e.y}else{if(Re(n,e))return;t.uniform2uiv(this.addr,e),Ie(n,e)}}function Ay(t,e){let n=this.cache;if(e.x!==void 0){if(n[0]!==e.x||n[1]!==e.y||n[2]!==e.z)t.uniform3ui(this.addr,e.x,e.y,e.z),n[0]=e.x,n[1]=e.y,n[2]=e.z}else{if(Re(n,e))return;t.uniform3uiv(this.addr,e),Ie(n,e)}}function wy(t,e){let n=this.cache;if(e.x!==void 0){if(n[0]!==e.x||n[1]!==e.y||n[2]!==e.z||n[3]!==e.w)t.uniform4ui(this.addr,e.x,e.y,e.z,e.w),n[0]=e.x,n[1]=e.y,n[2]=e.z,n[3]=e.w}else{if(Re(n,e))return;t.uniform4uiv(this.addr,e),Ie(n,e)}}function Cy(t,e,n){let i=this.cache,s=n.allocateTextureUnit();if(i[0]!==s)t.uniform1i(this.addr,s),i[0]=s;let r;if(this.type===t.SAMPLER_2D_SHADOW)dh.compareFunction=n.isReversedDepthBuffer()?Aa:Ea,r=dh;else r=Up;n.setTexture2D(e||r,s)}function Ry(t,e,n){let i=this.cache,s=n.allocateTextureUnit();if(i[0]!==s)t.uniform1i(this.addr,s),i[0]=s;n.setTexture3D(e||Fp,s)}function Iy(t,e,n){let i=this.cache,s=n.allocateTextureUnit();if(i[0]!==s)t.uniform1i(this.addr,s),i[0]=s;n.setTextureCube(e||Op,s)}function Py(t,e,n){let i=this.cache,s=n.allocateTextureUnit();if(i[0]!==s)t.uniform1i(this.addr,s),i[0]=s;n.setTexture2DArray(e||Dp,s)}function Ly(t){switch(t){case 5126:return fy;case 35664:return py;case 35665:return my;case 35666:return gy;case 35674:return _y;case 35675:return xy;case 35676:return vy;case 5124:case 35670:return yy;case 35667:case 35671:return Sy;case 35668:case 35672:return My;case 35669:case 35673:return by;case 5125:return Ty;case 36294:return Ey;case 36295:return Ay;case 36296:return wy;case 35678:case 36198:case 36298:case 36306:case 35682:return Cy;case 35679:case 36299:case 36307:return Ry;case 35680:case 36300:case 36308:case 36293:return Iy;case 36289:case 36303:case 36311:case 36292:return Py}}function Ny(t,e){t.uniform1fv(this.addr,e)}function Uy(t,e){let n=Es(e,this.size,2);t.uniform2fv(this.addr,n)}function Dy(t,e){let n=Es(e,this.size,3);t.uniform3fv(this.addr,n)}function Fy(t,e){let n=Es(e,this.size,4);t.uniform4fv(this.addr,n)}function Oy(t,e){let n=Es(e,this.size,4);t.uniformMatrix2fv(this.addr,!1,n)}function By(t,e){let n=Es(e,this.size,9);t.uniformMatrix3fv(this.addr,!1,n)}function zy(t,e){let n=Es(e,this.size,16);t.uniformMatrix4fv(this.addr,!1,n)}function Gy(t,e){t.uniform1iv(this.addr,e)}function ky(t,e){t.uniform2iv(this.addr,e)}function Hy(t,e){t.uniform3iv(this.addr,e)}function Vy(t,e){t.uniform4iv(this.addr,e)}function Wy(t,e){t.uniform1uiv(this.addr,e)}function Xy(t,e){t.uniform2uiv(this.addr,e)}function qy(t,e){t.uniform3uiv(this.addr,e)}function Yy(t,e){t.uniform4uiv(this.addr,e)}function Zy(t,e,n){let i=this.cache,s=e.length,r=_o(n,s);if(!Re(i,r))t.uniform1iv(this.addr,r),Ie(i,r);let a;if(this.type===t.SAMPLER_2D_SHADOW)a=dh;else a=Up;for(let o=0;o!==s;++o)n.setTexture2D(e[o]||a,r[o])}function Jy(t,e,n){let i=this.cache,s=e.length,r=_o(n,s);if(!Re(i,r))t.uniform1iv(this.addr,r),Ie(i,r);for(let a=0;a!==s;++a)n.setTexture3D(e[a]||Fp,r[a])}function $y(t,e,n){let i=this.cache,s=e.length,r=_o(n,s);if(!Re(i,r))t.uniform1iv(this.addr,r),Ie(i,r);for(let a=0;a!==s;++a)n.setTextureCube(e[a]||Op,r[a])}function Ky(t,e,n){let i=this.cache,s=e.length,r=_o(n,s);if(!Re(i,r))t.uniform1iv(this.addr,r),Ie(i,r);for(let a=0;a!==s;++a)n.setTexture2DArray(e[a]||Dp,r[a])}function Qy(t){switch(t){case 5126:return Ny;case 35664:return Uy;case 35665:return Dy;case 35666:return Fy;case 35674:return Oy;case 35675:return By;case 35676:return zy;case 5124:case 35670:return Gy;case 35667:case 35671:return ky;case 35668:case 35672:return Hy;case 35669:case 35673:return Vy;case 5125:return Wy;case 36294:return Xy;case 36295:return qy;case 36296:return Yy;case 35678:case 36198:case 36298:case 36306:case 35682:return Zy;case 35679:case 36299:case 36307:return Jy;case 35680:case 36300:case 36308:case 36293:return $y;case 36289:case 36303:case 36311:case 36292:return Ky}}class Bp{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=Ly(e.type)}}class zp{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=Qy(e.type)}}class Gp{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){let i=this.seq;for(let s=0,r=i.length;s!==r;++s){let a=i[s];a.setValue(t,e[a.id],n)}}}var ch=/(\w+)(\])?(\[|\.)?/g;function yp(t,e){t.seq.push(e),t.map[e.id]=e}function jy(t,e,n){let i=t.name,s=i.length;ch.lastIndex=0;while(!0){let r=ch.exec(i),a=ch.lastIndex,o=r[1],l=r[2]==="]",c=r[3];if(l)o=o|0;if(c===void 0||c==="["&&a+2===s){yp(n,c===void 0?new Bp(o,t,e):new zp(o,t,e));break}else{let d=n.map[o];if(d===void 0)d=new Gp(o),yp(n,d);n=d}}}class vr{constructor(t,e){this.seq=[],this.map={};let n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){let a=t.getActiveUniform(e,r),o=t.getUniformLocation(e,a.name);jy(a,o,this)}let i=[],s=[];for(let r of this.seq)if(r.type===t.SAMPLER_2D_SHADOW||r.type===t.SAMPLER_CUBE_SHADOW||r.type===t.SAMPLER_2D_ARRAY_SHADOW)i.push(r);else s.push(r);if(i.length>0)this.seq=i.concat(s)}setValue(t,e,n,i){let s=this.map[e];if(s!==void 0)s.setValue(t,n,i)}setOptional(t,e,n){let i=e[n];if(i!==void 0)this.setValue(t,n,i)}static upload(t,e,n,i){for(let s=0,r=e.length;s!==r;++s){let a=e[s],o=n[a.id];if(o.needsUpdate!==!1)a.setValue(t,o.value,i)}}static seqWithValue(t,e){let n=[];for(let i=0,s=t.length;i!==s;++i){let r=t[i];if(r.id in e)n.push(r)}return n}}function Sp(t,e,n){let i=t.createShader(e);return t.shaderSource(i,n),t.compileShader(i),i}var tS=37297,eS=0;function nS(t,e){let n=t.split(`
`),i=[],s=Math.max(e-6,0),r=Math.min(e+6,n.length);for(let a=s;a<r;a++){let o=a+1;i.push(`${o===e?">":" "} ${o}: ${n[a]}`)}return i.join(`
`)}var Mp=new Xt;function iS(t){ne._getMatrix(Mp,ne.workingColorSpace,t);let e=`mat3( ${Mp.elements.map((n)=>n.toFixed(4))} )`;switch(ne.getTransfer(t)){case ic:return[e,"LinearTransferOETF"];case ge:return[e,"sRGBTransferOETF"];default:return dt("WebGLProgram: Unsupported color space: ",t),[e,"LinearTransferOETF"]}}function bp(t,e,n){let i=t.getShaderParameter(e,t.COMPILE_STATUS),r=(t.getShaderInfoLog(e)||"").trim();if(i&&r==="")return"";let a=/ERROR: 0:(\d+)/.exec(r);if(a){let o=parseInt(a[1]);return n.toUpperCase()+`

`+r+`

`+nS(t.getShaderSource(e),o)}else return r}function sS(t,e){let n=iS(e);return[`vec4 ${t}( vec4 value ) {`,`	return ${n[1]}( vec4( value.rgb * ${n[0]}, value.a ) );`,"}"].join(`
`)}var rS={[dl]:"Linear",[fl]:"Reinhard",[pl]:"Cineon",[ml]:"ACESFilmic",[_l]:"AgX",[xl]:"Neutral",[gl]:"Custom"};function aS(t,e){let n=rS[e];if(n===void 0)return dt("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+t+"( vec3 color ) { return LinearToneMapping( color ); }";return"vec3 "+t+"( vec3 color ) { return "+n+"ToneMapping( color ); }"}var mo=new R;function oS(){ne.getLuminanceCoefficients(mo);let t=mo.x.toFixed(4),e=mo.y.toFixed(4),n=mo.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${t}, ${e}, ${n} );`,"\treturn dot( weights, rgb );","}"].join(`
`)}function lS(t){return[t.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",t.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(xr).join(`
`)}function cS(t){let e=[];for(let n in t){let i=t[n];if(i===!1)continue;e.push("#define "+n+" "+i)}return e.join(`
`)}function hS(t,e){let n={},i=t.getProgramParameter(e,t.ACTIVE_ATTRIBUTES);for(let s=0;s<i;s++){let r=t.getActiveAttrib(e,s),a=r.name,o=1;if(r.type===t.FLOAT_MAT2)o=2;if(r.type===t.FLOAT_MAT3)o=3;if(r.type===t.FLOAT_MAT4)o=4;n[a]={type:r.type,location:t.getAttribLocation(e,a),locationSize:o}}return n}function xr(t){return t!==""}function Tp(t,e){let n=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return t.replace(/NUM_SUN_LIGHTS/g,e.numSunLights).replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,e.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Ep(t,e){return t.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}var uS=/^[ \t]*#include +<([\w\d./]+)>/gm;function fh(t){return t.replace(uS,fS)}var dS=new Map;function fS(t,e){let n=Qt[e];if(n===void 0){let i=dS.get(e);if(i!==void 0)n=Qt[i],dt('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,i);else throw Error("THREE.WebGLProgram: Can not resolve #include <"+e+">")}return fh(n)}var pS=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Ap(t){return t.replace(pS,mS)}function mS(t,e,n,i){let s="";for(let r=parseInt(e);r<parseInt(n);r++)s+=i.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function wp(t){let e=`precision ${t.precision} float;
	precision ${t.precision} int;
	precision ${t.precision} sampler2D;
	precision ${t.precision} samplerCube;
	precision ${t.precision} sampler3D;
	precision ${t.precision} sampler2DArray;
	precision ${t.precision} sampler2DShadow;
	precision ${t.precision} samplerCubeShadow;
	precision ${t.precision} sampler2DArrayShadow;
	precision ${t.precision} isampler2D;
	precision ${t.precision} isampler3D;
	precision ${t.precision} isamplerCube;
	precision ${t.precision} isampler2DArray;
	precision ${t.precision} usampler2D;
	precision ${t.precision} usampler3D;
	precision ${t.precision} usamplerCube;
	precision ${t.precision} usampler2DArray;
	`;if(t.precision==="highp")e+=`
#define HIGH_PRECISION`;else if(t.precision==="mediump")e+=`
#define MEDIUM_PRECISION`;else if(t.precision==="lowp")e+=`
#define LOW_PRECISION`;return e}var gS={[Js]:"SHADOWMAP_TYPE_PCF",[ps]:"SHADOWMAP_TYPE_VSM"};function _S(t){return gS[t.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var xS={[_s]:"ENVMAP_TYPE_CUBE",[wi]:"ENVMAP_TYPE_CUBE",[Qs]:"ENVMAP_TYPE_CUBE_UV"};function vS(t){if(t.envMap===!1)return"ENVMAP_TYPE_CUBE";return xS[t.envMapMode]||"ENVMAP_TYPE_CUBE"}var yS={[wi]:"ENVMAP_MODE_REFRACTION"};function SS(t){if(t.envMap===!1)return"ENVMAP_MODE_REFLECTION";return yS[t.envMapMode]||"ENVMAP_MODE_REFLECTION"}var MS={[md]:"ENVMAP_BLENDING_MULTIPLY",[gd]:"ENVMAP_BLENDING_MIX",[_d]:"ENVMAP_BLENDING_ADD"};function bS(t){if(t.envMap===!1)return"ENVMAP_BLENDING_NONE";return MS[t.combine]||"ENVMAP_BLENDING_NONE"}function TS(t){let e=t.envMapCubeUVHeight;if(e===null)return null;let n=Math.log2(e)-2,i=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,n),112)),texelHeight:i,maxMip:n}}function ES(t,e,n,i){let s=t.getContext(),{defines:r,vertexShader:a,fragmentShader:o}=n,l=_S(n),c=vS(n),h=SS(n),d=bS(n),u=TS(n),f=lS(n),m=cS(r),_=s.createProgram(),g,p,S=n.glslVersion?"#version "+n.glslVersion+`
`:"";if(n.isRawShaderMaterial){if(g=["#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,m].filter(xr).join(`
`),g.length>0)g+=`
`;if(p=["#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,m].filter(xr).join(`
`),p.length>0)p+=`
`}else g=[wp(n),"#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,m,n.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",n.batching?"#define USE_BATCHING":"",n.batchingColor?"#define USE_BATCHING_COLOR":"",n.instancing?"#define USE_INSTANCING":"",n.instancingColor?"#define USE_INSTANCING_COLOR":"",n.instancingMorph?"#define USE_INSTANCING_MORPH":"",n.useFog&&n.fog?"#define USE_FOG":"",n.useFog&&n.fogExp2?"#define FOG_EXP2":"",n.map?"#define USE_MAP":"",n.envMap?"#define USE_ENVMAP":"",n.envMap?"#define "+h:"",n.lightMap?"#define USE_LIGHTMAP":"",n.aoMap?"#define USE_AOMAP":"",n.bumpMap?"#define USE_BUMPMAP":"",n.normalMap?"#define USE_NORMALMAP":"",n.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",n.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",n.displacementMap?"#define USE_DISPLACEMENTMAP":"",n.emissiveMap?"#define USE_EMISSIVEMAP":"",n.anisotropy?"#define USE_ANISOTROPY":"",n.anisotropyMap?"#define USE_ANISOTROPYMAP":"",n.clearcoatMap?"#define USE_CLEARCOATMAP":"",n.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",n.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",n.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",n.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",n.specularMap?"#define USE_SPECULARMAP":"",n.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",n.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",n.roughnessMap?"#define USE_ROUGHNESSMAP":"",n.metalnessMap?"#define USE_METALNESSMAP":"",n.alphaMap?"#define USE_ALPHAMAP":"",n.alphaHash?"#define USE_ALPHAHASH":"",n.transmission?"#define USE_TRANSMISSION":"",n.transmissionMap?"#define USE_TRANSMISSIONMAP":"",n.thicknessMap?"#define USE_THICKNESSMAP":"",n.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",n.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",n.mapUv?"#define MAP_UV "+n.mapUv:"",n.alphaMapUv?"#define ALPHAMAP_UV "+n.alphaMapUv:"",n.lightMapUv?"#define LIGHTMAP_UV "+n.lightMapUv:"",n.aoMapUv?"#define AOMAP_UV "+n.aoMapUv:"",n.emissiveMapUv?"#define EMISSIVEMAP_UV "+n.emissiveMapUv:"",n.bumpMapUv?"#define BUMPMAP_UV "+n.bumpMapUv:"",n.normalMapUv?"#define NORMALMAP_UV "+n.normalMapUv:"",n.displacementMapUv?"#define DISPLACEMENTMAP_UV "+n.displacementMapUv:"",n.metalnessMapUv?"#define METALNESSMAP_UV "+n.metalnessMapUv:"",n.roughnessMapUv?"#define ROUGHNESSMAP_UV "+n.roughnessMapUv:"",n.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+n.anisotropyMapUv:"",n.clearcoatMapUv?"#define CLEARCOATMAP_UV "+n.clearcoatMapUv:"",n.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+n.clearcoatNormalMapUv:"",n.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+n.clearcoatRoughnessMapUv:"",n.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+n.iridescenceMapUv:"",n.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+n.iridescenceThicknessMapUv:"",n.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+n.sheenColorMapUv:"",n.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+n.sheenRoughnessMapUv:"",n.specularMapUv?"#define SPECULARMAP_UV "+n.specularMapUv:"",n.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+n.specularColorMapUv:"",n.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+n.specularIntensityMapUv:"",n.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+n.transmissionMapUv:"",n.thicknessMapUv?"#define THICKNESSMAP_UV "+n.thicknessMapUv:"",n.vertexTangents&&n.flatShading===!1?"#define USE_TANGENT":"",n.vertexNormals?"#define HAS_NORMAL":"",n.vertexColors?"#define USE_COLOR":"",n.vertexAlphas?"#define USE_COLOR_ALPHA":"",n.vertexUv1s?"#define USE_UV1":"",n.vertexUv2s?"#define USE_UV2":"",n.vertexUv3s?"#define USE_UV3":"",n.pointsUvs?"#define USE_POINTS_UV":"",n.flatShading?"#define FLAT_SHADED":"",n.skinning?"#define USE_SKINNING":"",n.morphTargets?"#define USE_MORPHTARGETS":"",n.morphNormals&&n.flatShading===!1?"#define USE_MORPHNORMALS":"",n.morphColors?"#define USE_MORPHCOLORS":"",n.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+n.morphTextureStride:"",n.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+n.morphTargetsCount:"",n.doubleSided?"#define DOUBLE_SIDED":"",n.flipSided?"#define FLIP_SIDED":"",n.shadowMapEnabled?"#define USE_SHADOWMAP":"",n.shadowMapEnabled?"#define "+l:"",n.sizeAttenuation?"#define USE_SIZEATTENUATION":"",n.numLightProbes>0?"#define USE_LIGHT_PROBES":"",n.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",n.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","\tattribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","\tattribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","\tuniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","\tattribute vec2 uv1;","#endif","#ifdef USE_UV2","\tattribute vec2 uv2;","#endif","#ifdef USE_UV3","\tattribute vec2 uv3;","#endif","#ifdef USE_TANGENT","\tattribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","\tattribute vec4 color;","#elif defined( USE_COLOR )","\tattribute vec3 color;","#endif","#ifdef USE_SKINNING","\tattribute vec4 skinIndex;","\tattribute vec4 skinWeight;","#endif",`
`].filter(xr).join(`
`),p=[wp(n),"#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,m,n.useFog&&n.fog?"#define USE_FOG":"",n.useFog&&n.fogExp2?"#define FOG_EXP2":"",n.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",n.map?"#define USE_MAP":"",n.matcap?"#define USE_MATCAP":"",n.envMap?"#define USE_ENVMAP":"",n.envMap?"#define "+c:"",n.envMap?"#define "+h:"",n.envMap?"#define "+d:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",n.lightMap?"#define USE_LIGHTMAP":"",n.aoMap?"#define USE_AOMAP":"",n.bumpMap?"#define USE_BUMPMAP":"",n.normalMap?"#define USE_NORMALMAP":"",n.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",n.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",n.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",n.emissiveMap?"#define USE_EMISSIVEMAP":"",n.anisotropy?"#define USE_ANISOTROPY":"",n.anisotropyMap?"#define USE_ANISOTROPYMAP":"",n.clearcoat?"#define USE_CLEARCOAT":"",n.clearcoatMap?"#define USE_CLEARCOATMAP":"",n.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",n.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",n.dispersion?"#define USE_DISPERSION":"",n.retroreflection?"#define USE_RETROREFLECTION":"",n.iridescence?"#define USE_IRIDESCENCE":"",n.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",n.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",n.specularMap?"#define USE_SPECULARMAP":"",n.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",n.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",n.roughnessMap?"#define USE_ROUGHNESSMAP":"",n.metalnessMap?"#define USE_METALNESSMAP":"",n.alphaMap?"#define USE_ALPHAMAP":"",n.alphaTest?"#define USE_ALPHATEST":"",n.alphaHash?"#define USE_ALPHAHASH":"",n.sheen?"#define USE_SHEEN":"",n.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",n.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",n.transmission?"#define USE_TRANSMISSION":"",n.transmissionMap?"#define USE_TRANSMISSIONMAP":"",n.thicknessMap?"#define USE_THICKNESSMAP":"",n.vertexTangents&&n.flatShading===!1?"#define USE_TANGENT":"",n.vertexColors||n.instancingColor?"#define USE_COLOR":"",n.vertexAlphas||n.batchingColor?"#define USE_COLOR_ALPHA":"",n.vertexUv1s?"#define USE_UV1":"",n.vertexUv2s?"#define USE_UV2":"",n.vertexUv3s?"#define USE_UV3":"",n.pointsUvs?"#define USE_POINTS_UV":"",n.gradientMap?"#define USE_GRADIENTMAP":"",n.flatShading?"#define FLAT_SHADED":"",n.doubleSided?"#define DOUBLE_SIDED":"",n.flipSided?"#define FLIP_SIDED":"",n.shadowMapEnabled?"#define USE_SHADOWMAP":"",n.shadowMapEnabled?"#define "+l:"",n.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",n.numLightProbes>0?"#define USE_LIGHT_PROBES":"",n.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",n.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",n.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",n.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",n.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",n.toneMapping!==gn?"#define TONE_MAPPING":"",n.toneMapping!==gn?Qt.tonemapping_pars_fragment:"",n.toneMapping!==gn?aS("toneMapping",n.toneMapping):"",n.dithering?"#define DITHERING":"",n.opaque?"#define OPAQUE":"",Qt.colorspace_pars_fragment,sS("linearToOutputTexel",n.outputColorSpace),oS(),n.useDepthPacking?"#define DEPTH_PACKING "+n.depthPacking:"",`
`].filter(xr).join(`
`);if(a=fh(a),a=Tp(a,n),a=Ep(a,n),o=fh(o),o=Tp(o,n),o=Ep(o,n),a=Ap(a),o=Ap(o),n.isRawShaderMaterial!==!0)S=`#version 300 es
`,g=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+g,p=["#define varying in",n.glslVersion===sc?"":"layout(location = 0) out highp vec4 pc_fragColor;",n.glslVersion===sc?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p;let E=S+g+a,x=S+p+o,T=Sp(s,s.VERTEX_SHADER,E),C=Sp(s,s.FRAGMENT_SHADER,x);if(s.attachShader(_,T),s.attachShader(_,C),n.index0AttributeName!==void 0)s.bindAttribLocation(_,0,n.index0AttributeName);else if(n.hasPositionAttribute===!0)s.bindAttribLocation(_,0,"position");s.linkProgram(_);function w(L){if(t.debug.checkShaderErrors){let F=s.getProgramInfoLog(_)||"",Z=s.getShaderInfoLog(T)||"",P=s.getShaderInfoLog(C)||"",G=F.trim(),J=Z.trim(),k=P.trim(),at=!0,W=!0;if(s.getProgramParameter(_,s.LINK_STATUS)===!1)if(at=!1,typeof t.debug.onShaderError==="function")t.debug.onShaderError(s,_,T,C);else{let Q=bp(s,T,"vertex"),it=bp(s,C,"fragment");Lt("WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(_,s.VALIDATE_STATUS)+`

Material Name: `+L.name+`
Material Type: `+L.type+`

Program Info Log: `+G+`
`+Q+`
`+it)}else if(G!=="")dt("WebGLProgram: Program Info Log:",G);else if(J===""||k==="")W=!1;if(W)L.diagnostics={runnable:at,programLog:G,vertexShader:{log:J,prefix:g},fragmentShader:{log:k,prefix:p}}}s.deleteShader(T),s.deleteShader(C),v=new vr(s,_),b=hS(s,_)}let v;this.getUniforms=function(){if(v===void 0)w(this);return v};let b;this.getAttributes=function(){if(b===void 0)w(this);return b};let O=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){if(O===!1)O=s.getProgramParameter(_,tS);return O},this.destroy=function(){i.releaseStatesOfProgram(this),s.deleteProgram(_),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=eS++,this.cacheKey=e,this.usedTimes=1,this.program=_,this.vertexShader=T,this.fragmentShader=C,this}var AS=0;class kp{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t,e,n){let i=this._getShaderCacheForMaterial(t);if(i.has(e)===!1)i.add(e),e.usedTimes++;if(i.has(n)===!1)i.add(n),n.usedTimes++;return this}remove(t){let e=this.materialCache.get(t);for(let n of e)if(n.usedTimes--,n.usedTimes===0)this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderStage(t){return this._getShaderStage(t.vertexShader)}getFragmentShaderStage(t){return this._getShaderStage(t.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){let e=this.materialCache,n=e.get(t);if(n===void 0)n=new Set,e.set(t,n);return n}_getShaderStage(t){let e=this.shaderCache,n=e.get(t);if(n===void 0)n=new Hp(t),e.set(t,n);return n}}class Hp{constructor(t){this.id=AS++,this.code=t,this.usedTimes=0}}function wS(t){return t===Pi||t===ba||t===Ta}function CS(t,e,n,i,s,r){let a=new ir,o=new kp,l=new Set,c=[],h=new Map,{logarithmicDepthBuffer:d,precision:u}=i,f={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function m(v){if(l.add(v),v===0)return"uv";return`uv${v}`}function _(v,b,O,L,F,Z){let P=L.fog,G=F.geometry,J=v.isMeshStandardMaterial||v.isMeshLambertMaterial||v.isMeshPhongMaterial?L.environment:null,k=v.isMeshStandardMaterial||v.isMeshLambertMaterial&&!v.envMap||v.isMeshPhongMaterial&&!v.envMap,at=e.get(v.envMap||J,k),W=!!at&&at.mapping===Qs?at.image.height:null,Q=f[v.type];if(v.precision!==null){if(u=i.getMaxPrecision(v.precision),u!==v.precision)dt("WebGLProgram.getParameters:",v.precision,"not supported, using",u,"instead.")}let it=G.morphAttributes.position||G.morphAttributes.normal||G.morphAttributes.color,Dt=it!==void 0?it.length:0,Ft=0;if(G.morphAttributes.position!==void 0)Ft=1;if(G.morphAttributes.normal!==void 0)Ft=2;if(G.morphAttributes.color!==void 0)Ft=3;let he,$t,q,lt;if(Q){let _e=Pn[Q];he=_e.vertexShader,$t=_e.fragmentShader}else{he=v.vertexShader,$t=v.fragmentShader;let _e=o.getVertexShaderStage(v),oe=o.getFragmentShaderStage(v);o.update(v,_e,oe),q=_e.id,lt=oe.id}let rt=t.getRenderTarget(),Ot=t.state.buffers.depth.getReversed(),Gt=F.isInstancedMesh===!0,Ct=F.isBatchedMesh===!0,ue=!!v.map,tt=!!v.matcap,st=!!at,ot=!!v.aoMap,ct=!!v.lightMap,St=!!v.bumpMap&&v.wireframe===!1,Nt=!!v.normalMap,Bt=!!v.displacementMap,qt=!!v.emissiveMap,Yt=!!v.metalnessMap,I=!!v.roughnessMap,fe=v.anisotropy>0,jt=v.clearcoat>0,te=v.dispersion>0,A=v.retroreflectivity>0,y=v.iridescence>0,N=v.sheen>0,H=v.transmission>0,et=fe&&!!v.anisotropyMap,ht=jt&&!!v.clearcoatMap,ft=jt&&!!v.clearcoatNormalMap,X=jt&&!!v.clearcoatRoughnessMap,K=y&&!!v.iridescenceMap,bt=y&&!!v.iridescenceThicknessMap,Ut=N&&!!v.sheenColorMap,gt=N&&!!v.sheenRoughnessMap,ut=!!v.specularMap,zt=!!v.specularColorMap,kt=!!v.specularIntensityMap,ae=H&&!!v.transmissionMap,D=H&&!!v.thicknessMap,pt=!!v.gradientMap,Y=!!v.alphaMap,mt=v.alphaTest>0,Et=!!v.alphaHash,nt=!!v.extensions,vt=gn;if(v.toneMapped){if(rt===null||rt.isXRRenderTarget===!0)vt=t.toneMapping}let Zt={shaderID:Q,shaderType:v.type,shaderName:v.name,vertexShader:he,fragmentShader:$t,defines:v.defines,customVertexShaderID:q,customFragmentShaderID:lt,isRawShaderMaterial:v.isRawShaderMaterial===!0,glslVersion:v.glslVersion,precision:u,batching:Ct,batchingColor:Ct&&F._colorsTexture!==null,instancing:Gt,instancingColor:Gt&&F.instanceColor!==null,instancingMorph:Gt&&F.morphTexture!==null,outputColorSpace:rt===null?t.outputColorSpace:rt.isXRRenderTarget===!0?rt.texture.colorSpace:ne.workingColorSpace,alphaToCoverage:!!v.alphaToCoverage,map:ue,matcap:tt,envMap:st,envMapMode:st&&at.mapping,envMapCubeUVHeight:W,aoMap:ot,lightMap:ct,bumpMap:St,normalMap:Nt,displacementMap:Bt,emissiveMap:qt,normalMapObjectSpace:Nt&&v.normalMapType===Pd,normalMapTangentSpace:Nt&&v.normalMapType===ec,packedNormalMap:Nt&&v.normalMapType===ec&&wS(v.normalMap.format),metalnessMap:Yt,roughnessMap:I,anisotropy:fe,anisotropyMap:et,clearcoat:jt,clearcoatMap:ht,clearcoatNormalMap:ft,clearcoatRoughnessMap:X,dispersion:te,retroreflection:A,iridescence:y,iridescenceMap:K,iridescenceThicknessMap:bt,sheen:N,sheenColorMap:Ut,sheenRoughnessMap:gt,specularMap:ut,specularColorMap:zt,specularIntensityMap:kt,transmission:H,transmissionMap:ae,thicknessMap:D,gradientMap:pt,opaque:v.transparent===!1&&v.blending===$s&&v.alphaToCoverage===!1,alphaMap:Y,alphaTest:mt,alphaHash:Et,combine:v.combine,mapUv:ue&&m(v.map.channel),aoMapUv:ot&&m(v.aoMap.channel),lightMapUv:ct&&m(v.lightMap.channel),bumpMapUv:St&&m(v.bumpMap.channel),normalMapUv:Nt&&m(v.normalMap.channel),displacementMapUv:Bt&&m(v.displacementMap.channel),emissiveMapUv:qt&&m(v.emissiveMap.channel),metalnessMapUv:Yt&&m(v.metalnessMap.channel),roughnessMapUv:I&&m(v.roughnessMap.channel),anisotropyMapUv:et&&m(v.anisotropyMap.channel),clearcoatMapUv:ht&&m(v.clearcoatMap.channel),clearcoatNormalMapUv:ft&&m(v.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:X&&m(v.clearcoatRoughnessMap.channel),iridescenceMapUv:K&&m(v.iridescenceMap.channel),iridescenceThicknessMapUv:bt&&m(v.iridescenceThicknessMap.channel),sheenColorMapUv:Ut&&m(v.sheenColorMap.channel),sheenRoughnessMapUv:gt&&m(v.sheenRoughnessMap.channel),specularMapUv:ut&&m(v.specularMap.channel),specularColorMapUv:zt&&m(v.specularColorMap.channel),specularIntensityMapUv:kt&&m(v.specularIntensityMap.channel),transmissionMapUv:ae&&m(v.transmissionMap.channel),thicknessMapUv:D&&m(v.thicknessMap.channel),alphaMapUv:Y&&m(v.alphaMap.channel),vertexTangents:!!G.attributes.tangent&&(Nt||fe),vertexNormals:!!G.attributes.normal,vertexColors:v.vertexColors,vertexAlphas:v.vertexColors===!0&&!!G.attributes.color&&G.attributes.color.itemSize===4,pointsUvs:F.isPoints===!0&&!!G.attributes.uv&&(ue||Y),fog:!!P,useFog:v.fog===!0,fogExp2:!!P&&P.isFogExp2,flatShading:v.wireframe===!1&&(v.flatShading===!0||G.attributes.normal===void 0&&Nt===!1&&(v.isMeshLambertMaterial||v.isMeshPhongMaterial||v.isMeshStandardMaterial||v.isMeshPhysicalMaterial)),sizeAttenuation:v.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:Ot,skinning:F.isSkinnedMesh===!0,hasPositionAttribute:G.attributes.position!==void 0,morphTargets:G.morphAttributes.position!==void 0,morphNormals:G.morphAttributes.normal!==void 0,morphColors:G.morphAttributes.color!==void 0,morphTargetsCount:Dt,morphTextureStride:Ft,numSunLights:b.sun.length,numDirLights:b.directional.length,numPointLights:b.point.length,numSpotLights:b.spot.length,numSpotLightMaps:b.spotLightMap.length,numRectAreaLights:b.rectArea.length,numHemiLights:b.hemi.length,numSunLightShadows:b.sunShadowMap.length,numDirLightShadows:b.directionalShadowMap.length,numPointLightShadows:b.pointShadowMap.length,numSpotLightShadows:b.spotShadowMap.length,numSpotLightShadowsWithMaps:b.numSpotLightShadowsWithMaps,numLightProbes:b.numLightProbes,numLightProbeGrids:Z.length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:v.dithering,shadowMapEnabled:t.shadowMap.enabled&&O.length>0,shadowMapType:t.shadowMap.type,toneMapping:vt,decodeVideoTexture:ue&&v.map.isVideoTexture===!0&&ne.getTransfer(v.map.colorSpace)===ge,decodeVideoTextureEmissive:qt&&v.emissiveMap.isVideoTexture===!0&&ne.getTransfer(v.emissiveMap.colorSpace)===ge,premultipliedAlpha:v.premultipliedAlpha,doubleSided:v.side===wn,flipSided:v.side===Ke,useDepthPacking:v.depthPacking>=0,depthPacking:v.depthPacking||0,index0AttributeName:v.index0AttributeName,extensionClipCullDistance:nt&&v.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(nt&&v.extensions.multiDraw===!0||Ct)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:v.customProgramCacheKey()};return Zt.vertexUv1s=l.has(1),Zt.vertexUv2s=l.has(2),Zt.vertexUv3s=l.has(3),l.clear(),Zt}function g(v){let b=[];if(v.shaderID)b.push(v.shaderID);else b.push(v.customVertexShaderID),b.push(v.customFragmentShaderID);if(v.defines!==void 0)for(let O in v.defines)b.push(O),b.push(v.defines[O]);if(v.isRawShaderMaterial===!1)p(b,v),S(b,v),b.push(t.outputColorSpace);return b.push(v.customProgramCacheKey),b.join()}function p(v,b){v.push(b.precision),v.push(b.outputColorSpace),v.push(b.envMapMode),v.push(b.envMapCubeUVHeight),v.push(b.mapUv),v.push(b.alphaMapUv),v.push(b.lightMapUv),v.push(b.aoMapUv),v.push(b.bumpMapUv),v.push(b.normalMapUv),v.push(b.displacementMapUv),v.push(b.emissiveMapUv),v.push(b.metalnessMapUv),v.push(b.roughnessMapUv),v.push(b.anisotropyMapUv),v.push(b.clearcoatMapUv),v.push(b.clearcoatNormalMapUv),v.push(b.clearcoatRoughnessMapUv),v.push(b.iridescenceMapUv),v.push(b.iridescenceThicknessMapUv),v.push(b.sheenColorMapUv),v.push(b.sheenRoughnessMapUv),v.push(b.specularMapUv),v.push(b.specularColorMapUv),v.push(b.specularIntensityMapUv),v.push(b.transmissionMapUv),v.push(b.thicknessMapUv),v.push(b.combine),v.push(b.fogExp2),v.push(b.sizeAttenuation),v.push(b.morphTargetsCount),v.push(b.morphAttributeCount),v.push(b.numSunLights),v.push(b.numDirLights),v.push(b.numPointLights),v.push(b.numSpotLights),v.push(b.numSpotLightMaps),v.push(b.numHemiLights),v.push(b.numRectAreaLights),v.push(b.numSunLightShadows),v.push(b.numDirLightShadows),v.push(b.numPointLightShadows),v.push(b.numSpotLightShadows),v.push(b.numSpotLightShadowsWithMaps),v.push(b.numLightProbes),v.push(b.shadowMapType),v.push(b.toneMapping),v.push(b.numClippingPlanes),v.push(b.numClipIntersection),v.push(b.depthPacking)}function S(v,b){if(a.disableAll(),b.instancing)a.enable(0);if(b.instancingColor)a.enable(1);if(b.instancingMorph)a.enable(2);if(b.matcap)a.enable(3);if(b.envMap)a.enable(4);if(b.normalMapObjectSpace)a.enable(5);if(b.normalMapTangentSpace)a.enable(6);if(b.clearcoat)a.enable(7);if(b.iridescence)a.enable(8);if(b.alphaTest)a.enable(9);if(b.vertexColors)a.enable(10);if(b.vertexAlphas)a.enable(11);if(b.vertexUv1s)a.enable(12);if(b.vertexUv2s)a.enable(13);if(b.vertexUv3s)a.enable(14);if(b.vertexTangents)a.enable(15);if(b.anisotropy)a.enable(16);if(b.alphaHash)a.enable(17);if(b.batching)a.enable(18);if(b.dispersion)a.enable(19);if(b.retroreflection)a.enable(24);if(b.batchingColor)a.enable(20);if(b.gradientMap)a.enable(21);if(b.packedNormalMap)a.enable(22);if(b.vertexNormals)a.enable(23);if(v.push(a.mask),a.disableAll(),b.fog)a.enable(0);if(b.useFog)a.enable(1);if(b.flatShading)a.enable(2);if(b.logarithmicDepthBuffer)a.enable(3);if(b.reversedDepthBuffer)a.enable(4);if(b.skinning)a.enable(5);if(b.morphTargets)a.enable(6);if(b.morphNormals)a.enable(7);if(b.morphColors)a.enable(8);if(b.premultipliedAlpha)a.enable(9);if(b.shadowMapEnabled)a.enable(10);if(b.doubleSided)a.enable(11);if(b.flipSided)a.enable(12);if(b.useDepthPacking)a.enable(13);if(b.dithering)a.enable(14);if(b.transmission)a.enable(15);if(b.sheen)a.enable(16);if(b.opaque)a.enable(17);if(b.pointsUvs)a.enable(18);if(b.decodeVideoTexture)a.enable(19);if(b.decodeVideoTextureEmissive)a.enable(20);if(b.alphaToCoverage)a.enable(21);if(b.numLightProbeGrids>0)a.enable(22);if(b.hasPositionAttribute)a.enable(23);v.push(a.mask)}function E(v){let b=f[v.type],O;if(b){let L=Pn[b];O=ur.clone(L.uniforms)}else O=v.uniforms;return O}function x(v,b){let O=h.get(b);if(O!==void 0)++O.usedTimes;else O=new ES(t,b,v,s),c.push(O),h.set(b,O);return O}function T(v){if(--v.usedTimes===0){let b=c.indexOf(v);c[b]=c[c.length-1],c.pop(),h.delete(v.cacheKey),v.destroy()}}function C(v){o.remove(v)}function w(){o.dispose()}return{getParameters:_,getProgramCacheKey:g,getUniforms:E,acquireProgram:x,releaseProgram:T,releaseShaderCache:C,programs:c,dispose:w}}function RS(){let t=new WeakMap;function e(a){return t.has(a)}function n(a){let o=t.get(a);if(o===void 0)o={},t.set(a,o);return o}function i(a){t.delete(a)}function s(a,o,l){t.get(a)[o]=l}function r(){t=new WeakMap}return{has:e,get:n,remove:i,update:s,dispose:r}}function IS(t,e){if(t.groupOrder!==e.groupOrder)return t.groupOrder-e.groupOrder;else if(t.renderOrder!==e.renderOrder)return t.renderOrder-e.renderOrder;else if(t.material.id!==e.material.id)return t.material.id-e.material.id;else if(t.materialVariant!==e.materialVariant)return t.materialVariant-e.materialVariant;else if(t.z!==e.z)return t.z-e.z;else return t.id-e.id}function Cp(t,e){if(t.groupOrder!==e.groupOrder)return t.groupOrder-e.groupOrder;else if(t.renderOrder!==e.renderOrder)return t.renderOrder-e.renderOrder;else if(t.z!==e.z)return e.z-t.z;else return t.id-e.id}function Rp(){let t=[],e=0,n=[],i=[],s=[];function r(){e=0,n.length=0,i.length=0,s.length=0}function a(u){let f=0;if(u.isInstancedMesh)f+=2;if(u.isSkinnedMesh)f+=1;return f}function o(u,f,m,_,g,p){let S=t[e];if(S===void 0)S={id:u.id,object:u,geometry:f,material:m,materialVariant:a(u),groupOrder:_,renderOrder:u.renderOrder,z:g,group:p},t[e]=S;else S.id=u.id,S.object=u,S.geometry=f,S.material=m,S.materialVariant=a(u),S.groupOrder=_,S.renderOrder=u.renderOrder,S.z=g,S.group=p;return e++,S}function l(u,f,m,_,g,p,S){if(S.reversedDepth===!0)g=-g;let E=o(u,f,m,_,g,p);if(m.transmission>0)i.push(E);else if(m.transparent===!0)s.push(E);else n.push(E)}function c(u,f,m,_,g,p){let S=o(u,f,m,_,g,p);if(m.transmission>0)i.unshift(S);else if(m.transparent===!0)s.unshift(S);else n.unshift(S)}function h(u,f){if(n.length>1)n.sort(u||IS);if(i.length>1)i.sort(f||Cp);if(s.length>1)s.sort(f||Cp)}function d(){for(let u=e,f=t.length;u<f;u++){let m=t[u];if(m.id===null)break;m.id=null,m.object=null,m.geometry=null,m.material=null,m.group=null}}return{opaque:n,transmissive:i,transparent:s,init:r,push:l,unshift:c,finish:d,sort:h}}function PS(){let t=new WeakMap;function e(i,s){let r=t.get(i),a;if(r===void 0)a=new Rp,t.set(i,[a]);else if(s>=r.length)a=new Rp,r.push(a);else a=r[s];return a}function n(){t=new WeakMap}return{get:e,dispose:n}}function LS(){let t={};return{get:function(e){if(t[e.id]!==void 0)return t[e.id];let n;switch(e.type){case"SunLight":case"DirectionalLight":n={direction:new R,color:new _t};break;case"SpotLight":n={position:new R,direction:new R,color:new _t,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":n={position:new R,color:new _t,distance:0,decay:0};break;case"HemisphereLight":n={direction:new R,skyColor:new _t,groundColor:new _t};break;case"RectAreaLight":n={color:new _t,position:new R,halfWidth:new R,halfHeight:new R};break}return t[e.id]=n,n}}}function NS(){let t={};return{get:function(e){if(t[e.id]!==void 0)return t[e.id];let n;switch(e.type){case"SunLight":case"DirectionalLight":n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new j};break;case"SpotLight":n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new j};break;case"PointLight":n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new j,shadowCameraNear:1,shadowCameraFar:1000};break}return t[e.id]=n,n}}}var US=0;function DS(t,e){return(e.castShadow?2:0)-(t.castShadow?2:0)+(e.map?1:0)-(t.map?1:0)}function FS(t){let e=new LS,n=NS(),i={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)i.probe.push(new R);let s=new R,r=new Vt,a=new Vt;function o(c){let h=0,d=0,u=0;for(let F=0;F<9;F++)i.probe[F].set(0,0,0);let f=0,m=0,_=0,g=0,p=0,S=0,E=0,x=0,T=0,C=0,w=0,v=0,b=0,O=0;c.sort(DS);for(let F=0,Z=c.length;F<Z;F++){let P=c[F],{color:G,intensity:J,distance:k}=P,at=null;if(P.shadow&&P.shadow.map)if(P.shadow.map.texture.format===Pi)at=P.shadow.map.texture;else at=P.shadow.map.depthTexture||P.shadow.map.texture;if(P.isAmbientLight)h+=G.r*J,d+=G.g*J,u+=G.b*J;else if(P.isLightProbe){for(let W=0;W<9;W++)i.probe[W].addScaledVector(P.sh.coefficients[W],J);O++}else if(P.isSunLight){let W=e.get(P);if(W.color.copy(P.color).multiplyScalar(P.intensity),P.castShadow){let Q=P.shadow,it=n.get(P);it.shadowIntensity=Q.intensity,it.shadowBias=Q.bias,it.shadowNormalBias=Q.normalBias,it.shadowRadius=Q.radius,it.shadowMapSize.copy(Q.mapSize).multiply(Q.getFrameExtents()),i.sunShadow[m]=it,i.sunShadowMap[m]=at;let Dt=Q.getViewportCount();for(let Ft=0;Ft<Dt;Ft++)i.sunShadowMatrix[_+Ft]=Q.getMatrix(Ft),i.sunShadowCascade[_+Ft]=Q._cascadeData[Ft];_+=Dt,m++}i.sun[f]=W,f++}else if(P.isDirectionalLight){let W=e.get(P);if(W.color.copy(P.color).multiplyScalar(P.intensity),P.castShadow){let Q=P.shadow,it=n.get(P);it.shadowIntensity=Q.intensity,it.shadowBias=Q.bias,it.shadowNormalBias=Q.normalBias,it.shadowRadius=Q.radius,it.shadowMapSize=Q.mapSize,i.directionalShadow[g]=it,i.directionalShadowMap[g]=at,i.directionalShadowMatrix[g]=P.shadow.matrix,T++}i.directional[g]=W,g++}else if(P.isSpotLight){let W=e.get(P);W.position.setFromMatrixPosition(P.matrixWorld),W.color.copy(G).multiplyScalar(J),W.distance=k,W.coneCos=Math.cos(P.angle),W.penumbraCos=Math.cos(P.angle*(1-P.penumbra)),W.decay=P.decay,i.spot[S]=W;let Q=P.shadow;if(P.map){if(i.spotLightMap[v]=P.map,v++,Q.updateMatrices(P),P.castShadow)b++}if(i.spotLightMatrix[S]=Q.matrix,P.castShadow){let it=n.get(P);it.shadowIntensity=Q.intensity,it.shadowBias=Q.bias,it.shadowNormalBias=Q.normalBias,it.shadowRadius=Q.radius,it.shadowMapSize=Q.mapSize,i.spotShadow[S]=it,i.spotShadowMap[S]=at,w++}S++}else if(P.isRectAreaLight){let W=e.get(P);W.color.copy(G).multiplyScalar(J),W.halfWidth.set(P.width*0.5,0,0),W.halfHeight.set(0,P.height*0.5,0),i.rectArea[E]=W,E++}else if(P.isPointLight){let W=e.get(P);if(W.color.copy(P.color).multiplyScalar(P.intensity),W.distance=P.distance,W.decay=P.decay,P.castShadow){let Q=P.shadow,it=n.get(P);it.shadowIntensity=Q.intensity,it.shadowBias=Q.bias,it.shadowNormalBias=Q.normalBias,it.shadowRadius=Q.radius,it.shadowMapSize=Q.mapSize,it.shadowCameraNear=Q.camera.near,it.shadowCameraFar=Q.camera.far,i.pointShadow[p]=it,i.pointShadowMap[p]=at,i.pointShadowMatrix[p]=P.shadow.matrix,C++}i.point[p]=W,p++}else if(P.isHemisphereLight){let W=e.get(P);W.skyColor.copy(P.color).multiplyScalar(J),W.groundColor.copy(P.groundColor).multiplyScalar(J),i.hemi[x]=W,x++}}if(E>0)if(t.has("OES_texture_float_linear")===!0)i.rectAreaLTC1=xt.LTC_FLOAT_1,i.rectAreaLTC2=xt.LTC_FLOAT_2;else i.rectAreaLTC1=xt.LTC_HALF_1,i.rectAreaLTC2=xt.LTC_HALF_2;i.ambient[0]=h,i.ambient[1]=d,i.ambient[2]=u;let L=i.hash;if(L.sunLength!==f||L.directionalLength!==g||L.pointLength!==p||L.spotLength!==S||L.rectAreaLength!==E||L.hemiLength!==x||L.numSunShadows!==m||L.numDirectionalShadows!==T||L.numPointShadows!==C||L.numSpotShadows!==w||L.numSpotMaps!==v||L.numLightProbes!==O)i.sun.length=f,i.directional.length=g,i.spot.length=S,i.rectArea.length=E,i.point.length=p,i.hemi.length=x,i.sunShadow.length=m,i.sunShadowMap.length=m,i.sunShadowMatrix.length=_,i.sunShadowCascade.length=_,i.directionalShadow.length=T,i.directionalShadowMap.length=T,i.directionalShadowMatrix.length=T,i.pointShadow.length=C,i.pointShadowMap.length=C,i.pointShadowMatrix.length=C,i.spotShadow.length=w,i.spotShadowMap.length=w,i.spotLightMatrix.length=w+v-b,i.spotLightMap.length=v,i.numSpotLightShadowsWithMaps=b,i.numLightProbes=O,L.sunLength=f,L.directionalLength=g,L.pointLength=p,L.spotLength=S,L.rectAreaLength=E,L.hemiLength=x,L.numSunShadows=m,L.numDirectionalShadows=T,L.numPointShadows=C,L.numSpotShadows=w,L.numSpotMaps=v,L.numLightProbes=O,i.version=US++}function l(c,h){let d=0,u=0,f=0,m=0,_=0,g=0,p=h.matrixWorldInverse;for(let S=0,E=c.length;S<E;S++){let x=c[S];if(x.isSunLight){let T=i.sun[d];T.direction.setFromMatrixPosition(x.matrixWorld),T.direction.transformDirection(p),d++}else if(x.isDirectionalLight){let T=i.directional[u];T.direction.setFromMatrixPosition(x.matrixWorld),s.setFromMatrixPosition(x.target.matrixWorld),T.direction.sub(s),T.direction.transformDirection(p),u++}else if(x.isSpotLight){let T=i.spot[m];T.position.setFromMatrixPosition(x.matrixWorld),T.position.applyMatrix4(p),T.direction.setFromMatrixPosition(x.matrixWorld),s.setFromMatrixPosition(x.target.matrixWorld),T.direction.sub(s),T.direction.transformDirection(p),m++}else if(x.isRectAreaLight){let T=i.rectArea[_];T.position.setFromMatrixPosition(x.matrixWorld),T.position.applyMatrix4(p),a.identity(),r.copy(x.matrixWorld),r.premultiply(p),a.extractRotation(r),T.halfWidth.set(x.width*0.5,0,0),T.halfHeight.set(0,x.height*0.5,0),T.halfWidth.applyMatrix4(a),T.halfHeight.applyMatrix4(a),_++}else if(x.isPointLight){let T=i.point[f];T.position.setFromMatrixPosition(x.matrixWorld),T.position.applyMatrix4(p),f++}else if(x.isHemisphereLight){let T=i.hemi[g];T.direction.setFromMatrixPosition(x.matrixWorld),T.direction.transformDirection(p),g++}}}return{setup:o,setupView:l,state:i}}function Ip(t){let e=new FS(t),n=[],i=[],s=[];function r(u){d.camera=u,n.length=0,i.length=0,s.length=0}function a(u){n.push(u)}function o(u){i.push(u)}function l(u){s.push(u)}function c(){e.setup(n)}function h(u){e.setupView(n,u)}let d={lightsArray:n,shadowsArray:i,lightProbeGridArray:s,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:d,setupLights:c,setupLightsView:h,pushLight:a,pushShadow:o,pushLightProbeGrid:l}}function OS(t){let e=new WeakMap;function n(s,r=0){let a=e.get(s),o;if(a===void 0)o=new Ip(t),e.set(s,[o]);else if(r>=a.length)o=new Ip(t),a.push(o);else o=a[r];return o}function i(){e=new WeakMap}return{get:n,dispose:i}}var BS=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,zS=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,GS=[new R(1,0,0),new R(-1,0,0),new R(0,1,0),new R(0,-1,0),new R(0,0,1),new R(0,0,-1)],kS=[new R(0,-1,0),new R(0,-1,0),new R(0,0,1),new R(0,0,-1),new R(0,-1,0),new R(0,-1,0)],Pp=new Vt,_r=new R,hh=new R;function HS(t,e,n){let i=new ii,s=new j,r=new j,a=new de,o=new io,l=new so,c={},h=n.maxTextureSize,d={[ms]:Ke,[Ke]:ms,[wn]:wn},u=new De({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new j},radius:{value:4}},vertexShader:BS,fragmentShader:zS}),f=u.clone();f.defines.HORIZONTAL_PASS=1;let m=new Wt;m.setAttribute("position",new ce(new Float32Array([-1,-1,0.5,3,-1,0.5,-1,3,0.5]),3));let _=new Me(m,u),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Js;let p=this.type;this.render=function(C,w,v){if(g.enabled===!1)return;if(g.autoUpdate===!1&&g.needsUpdate===!1)return;if(C.length===0)return;if(this.type===ku)dt("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=Js;let b=t.getRenderTarget(),O=t.getActiveCubeFace(),L=t.getActiveMipmapLevel(),F=t.state;if(F.setBlending(Cn),F.buffers.depth.getReversed()===!0)F.buffers.color.setClear(0,0,0,0);else F.buffers.color.setClear(1,1,1,1);F.buffers.depth.setTest(!0),F.setScissorTest(!1);let Z=p!==this.type;if(Z)w.traverse(function(P){if(P.material)if(Array.isArray(P.material))P.material.forEach((G)=>G.needsUpdate=!0);else P.material.needsUpdate=!0});for(let P=0,G=C.length;P<G;P++){let J=C[P],k=J.shadow;if(k===void 0){dt("WebGLShadowMap:",J,"has no shadow.");continue}if(k.autoUpdate===!1&&k.needsUpdate===!1)continue;s.copy(k.mapSize);let at=k.getFrameExtents();if(s.multiply(at),r.copy(k.mapSize),s.x>h||s.y>h){if(s.x>h)r.x=Math.floor(h/at.x),s.x=r.x*at.x,k.mapSize.x=r.x;if(s.y>h)r.y=Math.floor(h/at.y),s.y=r.y*at.y,k.mapSize.y=r.y}let W=t.state.buffers.depth.getReversed();if(k.camera._reversedDepth=W,k.map===null||Z===!0){if(k.map!==null){if(k.map.depthTexture!==null)k.map.depthTexture.dispose(),k.map.depthTexture=null;k.map.dispose()}if(this.type===ps){if(J.isPointLight){dt("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}k.map=new Ce(s.x,s.y,{format:Pi,type:je,minFilter:Qe,magFilter:Qe,generateMipmaps:!1}),k.map.texture.name=J.name+".shadowMap",k.map.depthTexture=new Ui(s.x,s.y,Vn),k.map.depthTexture.name=J.name+".shadowMapDepth",k.map.depthTexture.format=Ri,k.map.depthTexture.compareFunction=null,k.map.depthTexture.minFilter=si,k.map.depthTexture.magFilter=si}else{if(J.isPointLight)k.map=new ph(s.x),k.map.depthTexture=new _c(s.x,ri);else k.map=new Ce(s.x,s.y),k.map.depthTexture=new Ui(s.x,s.y,ri);if(k.map.depthTexture.name=J.name+".shadowMap",k.map.depthTexture.format=Ri,this.type===Js)k.map.depthTexture.compareFunction=W?Aa:Ea,k.map.depthTexture.minFilter=Qe,k.map.depthTexture.magFilter=Qe;else k.map.depthTexture.compareFunction=null,k.map.depthTexture.minFilter=si,k.map.depthTexture.magFilter=si}k.camera.updateProjectionMatrix()}if(k.map.isWebGLCubeRenderTarget!==!0&&(k.map.width!==s.x||k.map.height!==s.y))k.map.setSize(s.x,s.y);let Q=k.map.isWebGLCubeRenderTarget?6:k.getViewportCount();if(J.isPointLight!==!0)k.updateMatrices(J,v);for(let it=0;it<Q;it++){let Dt=k.getCamera(it);if(J.isPointLight){let{camera:Ft,matrix:he}=k,$t=J.distance||Ft.far;if($t!==Ft.far)Ft.far=$t,Ft.updateProjectionMatrix();_r.setFromMatrixPosition(J.matrixWorld),Ft.position.copy(_r),hh.copy(Ft.position),hh.add(GS[it]),Ft.up.copy(kS[it]),Ft.lookAt(hh),Ft.updateMatrixWorld(),he.makeTranslation(-_r.x,-_r.y,-_r.z),Pp.multiplyMatrices(Ft.projectionMatrix,Ft.matrixWorldInverse),k._frustum.setFromProjectionMatrix(Pp,Ft.coordinateSystem,Ft.reversedDepth)}if(k.map.isWebGLCubeRenderTarget)t.setRenderTarget(k.map,it),t.clear();else{if(it===0)t.setRenderTarget(k.map),t.clear();let Ft=k.getViewport(it);a.set(r.x*Ft.x,r.y*Ft.y,r.x*Ft.z,r.y*Ft.w),F.viewport(a)}i=k.getFrustum(it),x(w,v,Dt,J,this.type)}if(k.isPointLightShadow!==!0&&this.type===ps)S(k,v);k.needsUpdate=!1}p=this.type,g.needsUpdate=!1,t.setRenderTarget(b,O,L)};function S(C,w){let v=e.update(_);if(u.defines.VSM_SAMPLES!==C.blurSamples)u.defines.VSM_SAMPLES=C.blurSamples,f.defines.VSM_SAMPLES=C.blurSamples,u.needsUpdate=!0,f.needsUpdate=!0;if(C.mapPass===null)C.mapPass=new Ce(s.x,s.y,{format:Pi,type:je});else if(C.mapPass.width!==C.map.width||C.mapPass.height!==C.map.height)C.mapPass.setSize(C.map.width,C.map.height);u.uniforms.shadow_pass.value=C.map.depthTexture,u.uniforms.resolution.value.set(C.map.width,C.map.height),u.uniforms.radius.value=C.radius,t.setRenderTarget(C.mapPass),t.clear(),t.renderBufferDirect(w,null,v,u,_,null),f.uniforms.shadow_pass.value=C.mapPass.texture,f.uniforms.resolution.value.set(C.map.width,C.map.height),f.uniforms.radius.value=C.radius,t.setRenderTarget(C.map),t.clear(),t.renderBufferDirect(w,null,v,f,_,null)}function E(C,w,v,b){let O=null,L=v.isPointLight===!0?C.customDistanceMaterial:C.customDepthMaterial;if(L!==void 0)O=L;else if(O=v.isPointLight===!0?l:o,t.localClippingEnabled&&w.clipShadows===!0&&Array.isArray(w.clippingPlanes)&&w.clippingPlanes.length!==0||w.displacementMap&&w.displacementScale!==0||w.alphaMap&&w.alphaTest>0||w.map&&w.alphaTest>0||w.alphaToCoverage===!0){let F=O.uuid,Z=w.uuid,P=c[F];if(P===void 0)P={},c[F]=P;let G=P[Z];if(G===void 0)G=O.clone(),P[Z]=G,w.addEventListener("dispose",T);O=G}if(O.visible=w.visible,O.wireframe=w.wireframe,b===ps)O.side=w.shadowSide!==null?w.shadowSide:w.side;else O.side=w.shadowSide!==null?w.shadowSide:d[w.side];if(O.alphaMap=w.alphaMap,O.alphaTest=w.alphaToCoverage===!0?0.5:w.alphaTest,O.map=w.map,O.clipShadows=w.clipShadows,O.clippingPlanes=w.clippingPlanes,O.clipIntersection=w.clipIntersection,O.displacementMap=w.displacementMap,O.displacementScale=w.displacementScale,O.displacementBias=w.displacementBias,O.wireframeLinewidth=w.wireframeLinewidth,O.linewidth=w.linewidth,v.isPointLight===!0&&O.isMeshDistanceMaterial===!0){let F=t.properties.get(O);F.light=v}return O}function x(C,w,v,b,O){if(C.visible===!1)return;if(C.layers.test(w.layers)&&(C.isMesh||C.isLine||C.isPoints)){if((C.castShadow||C.receiveShadow&&O===ps)&&(!C.frustumCulled||C.intersectsFrustum(i))){C.modelViewMatrix.multiplyMatrices(v.matrixWorldInverse,C.matrixWorld);let Z=e.update(C),P=C.material;if(Array.isArray(P)){let G=Z.groups;for(let J=0,k=G.length;J<k;J++){let at=G[J],W=P[at.materialIndex];if(W&&W.visible){let Q=E(C,W,b,O);C.onBeforeShadow(t,C,w,v,Z,Q,at),t.renderBufferDirect(v,null,Z,Q,C,at),C.onAfterShadow(t,C,w,v,Z,Q,at)}}}else if(P.visible){let G=E(C,P,b,O);C.onBeforeShadow(t,C,w,v,Z,G,null),t.renderBufferDirect(v,null,Z,G,C,null),C.onAfterShadow(t,C,w,v,Z,G,null)}}}let F=C.children;for(let Z=0,P=F.length;Z<P;Z++)x(F[Z],w,v,b,O)}function T(C){C.target.removeEventListener("dispose",T);for(let v in c){let b=c[v],O=C.target.uuid;if(O in b)b[O].dispose(),delete b[O]}}}function VS(t,e){function n(){let D=!1,pt=new de,Y=null,mt=new de(0,0,0,0);return{setMask:function(Et){if(Y!==Et&&!D)t.colorMask(Et,Et,Et,Et),Y=Et},setLocked:function(Et){D=Et},setClear:function(Et,nt,vt,Zt,_e){if(_e===!0)Et*=Zt,nt*=Zt,vt*=Zt;if(pt.set(Et,nt,vt,Zt),mt.equals(pt)===!1)t.clearColor(Et,nt,vt,Zt),mt.copy(pt)},reset:function(){D=!1,Y=null,mt.set(-1,0,0,0)}}}function i(){let D=!1,pt=!1,Y=null,mt=null,Et=null;return{setReversed:function(nt){if(pt!==nt){let vt=e.get("EXT_clip_control");if(nt)vt.clipControlEXT(vt.LOWER_LEFT_EXT,vt.ZERO_TO_ONE_EXT);else vt.clipControlEXT(vt.LOWER_LEFT_EXT,vt.NEGATIVE_ONE_TO_ONE_EXT);pt=nt;let Zt=Et;Et=null,this.setClear(Zt)}},getReversed:function(){return pt},setTest:function(nt){if(nt)rt(t.DEPTH_TEST);else Ot(t.DEPTH_TEST)},setMask:function(nt){if(Y!==nt&&!D)t.depthMask(nt),Y=nt},setFunc:function(nt){if(pt)nt=Vd[nt];if(mt!==nt){switch(nt){case ld:t.depthFunc(t.NEVER);break;case cd:t.depthFunc(t.ALWAYS);break;case hd:t.depthFunc(t.LESS);break;case ul:t.depthFunc(t.LEQUAL);break;case ud:t.depthFunc(t.EQUAL);break;case dd:t.depthFunc(t.GEQUAL);break;case fd:t.depthFunc(t.GREATER);break;case pd:t.depthFunc(t.NOTEQUAL);break;default:t.depthFunc(t.LEQUAL)}mt=nt}},setLocked:function(nt){D=nt},setClear:function(nt){if(Et!==nt){if(Et=nt,pt)nt=1-nt;t.clearDepth(nt)}},reset:function(){D=!1,Y=null,mt=null,Et=null,pt=!1}}}function s(){let D=!1,pt=null,Y=null,mt=null,Et=null,nt=null,vt=null,Zt=null,_e=null;return{setTest:function(oe){if(!D)if(oe)rt(t.STENCIL_TEST);else Ot(t.STENCIL_TEST)},setMask:function(oe){if(pt!==oe&&!D)t.stencilMask(oe),pt=oe},setFunc:function(oe,yn,Ln){if(Y!==oe||mt!==yn||Et!==Ln)t.stencilFunc(oe,yn,Ln),Y=oe,mt=yn,Et=Ln},setOp:function(oe,yn,Ln){if(nt!==oe||vt!==yn||Zt!==Ln)t.stencilOp(oe,yn,Ln),nt=oe,vt=yn,Zt=Ln},setLocked:function(oe){D=oe},setClear:function(oe){if(_e!==oe)t.clearStencil(oe),_e=oe},reset:function(){D=!1,pt=null,Y=null,mt=null,Et=null,nt=null,vt=null,Zt=null,_e=null}}}let r=new n,a=new i,o=new s,l=new WeakMap,c=new WeakMap,h={},d={},u={},f=new WeakMap,m=[],_=null,g=!1,p=null,S=null,E=null,x=null,T=null,C=null,w=null,v=new _t(0,0,0),b=0,O=!1,L=null,F=null,Z=null,P=null,G=null,J=t.getParameter(t.MAX_COMBINED_TEXTURE_IMAGE_UNITS),k=!1,at=0,W=t.getParameter(t.VERSION);if(W.indexOf("WebGL")!==-1)at=parseFloat(/^WebGL (\d)/.exec(W)[1]),k=at>=1;else if(W.indexOf("OpenGL ES")!==-1)at=parseFloat(/^OpenGL ES (\d)/.exec(W)[1]),k=at>=2;let Q=null,it={},Dt=t.getParameter(t.SCISSOR_BOX),Ft=t.getParameter(t.VIEWPORT),he=new de().fromArray(Dt),$t=new de().fromArray(Ft);function q(D,pt,Y,mt){let Et=new Uint8Array(4),nt=t.createTexture();t.bindTexture(D,nt),t.texParameteri(D,t.TEXTURE_MIN_FILTER,t.NEAREST),t.texParameteri(D,t.TEXTURE_MAG_FILTER,t.NEAREST);for(let vt=0;vt<Y;vt++)if(D===t.TEXTURE_3D||D===t.TEXTURE_2D_ARRAY)t.texImage3D(pt,0,t.RGBA,1,1,mt,0,t.RGBA,t.UNSIGNED_BYTE,Et);else t.texImage2D(pt+vt,0,t.RGBA,1,1,0,t.RGBA,t.UNSIGNED_BYTE,Et);return nt}let lt={};lt[t.TEXTURE_2D]=q(t.TEXTURE_2D,t.TEXTURE_2D,1),lt[t.TEXTURE_CUBE_MAP]=q(t.TEXTURE_CUBE_MAP,t.TEXTURE_CUBE_MAP_POSITIVE_X,6),lt[t.TEXTURE_2D_ARRAY]=q(t.TEXTURE_2D_ARRAY,t.TEXTURE_2D_ARRAY,1,1),lt[t.TEXTURE_3D]=q(t.TEXTURE_3D,t.TEXTURE_3D,1,1),r.setClear(0,0,0,1),a.setClear(1),o.setClear(0),rt(t.DEPTH_TEST),a.setFunc(ul),St(!1),Nt(ll),rt(t.CULL_FACE),ot(Cn);function rt(D){if(h[D]!==!0)t.enable(D),h[D]=!0}function Ot(D){if(h[D]!==!1)t.disable(D),h[D]=!1}function Gt(D,pt){if(u[D]!==pt){if(t.bindFramebuffer(D,pt),u[D]=pt,D===t.DRAW_FRAMEBUFFER)u[t.FRAMEBUFFER]=pt;if(D===t.FRAMEBUFFER)u[t.DRAW_FRAMEBUFFER]=pt;return!0}return!1}function Ct(D,pt){let Y=m,mt=!1;if(D){if(Y=f.get(pt),Y===void 0)Y=[],f.set(pt,Y);let Et=D.textures;if(Y.length!==Et.length||Y[0]!==t.COLOR_ATTACHMENT0){for(let nt=0,vt=Et.length;nt<vt;nt++)Y[nt]=t.COLOR_ATTACHMENT0+nt;Y.length=Et.length,mt=!0}}else if(Y[0]!==t.BACK)Y[0]=t.BACK,mt=!0;if(mt)t.drawBuffers(Y)}function ue(D){if(_!==D)return t.useProgram(D),_=D,!0;return!1}let tt={[gs]:t.FUNC_ADD,[Vu]:t.FUNC_SUBTRACT,[Wu]:t.FUNC_REVERSE_SUBTRACT};tt[Xu]=t.MIN,tt[qu]=t.MAX;let st={[Yu]:t.ZERO,[Zu]:t.ONE,[Ju]:t.SRC_COLOR,[Ku]:t.SRC_ALPHA,[id]:t.SRC_ALPHA_SATURATE,[ed]:t.DST_COLOR,[ju]:t.DST_ALPHA,[$u]:t.ONE_MINUS_SRC_COLOR,[Qu]:t.ONE_MINUS_SRC_ALPHA,[nd]:t.ONE_MINUS_DST_COLOR,[td]:t.ONE_MINUS_DST_ALPHA,[sd]:t.CONSTANT_COLOR,[rd]:t.ONE_MINUS_CONSTANT_COLOR,[ad]:t.CONSTANT_ALPHA,[od]:t.ONE_MINUS_CONSTANT_ALPHA};function ot(D,pt,Y,mt,Et,nt,vt,Zt,_e,oe){if(D===Cn){if(g===!0)Ot(t.BLEND),g=!1;return}if(g===!1)rt(t.BLEND),g=!0;if(D!==Hu){if(D!==p||oe!==O){if(S!==gs||T!==gs)t.blendEquation(t.FUNC_ADD),S=gs,T=gs;if(oe)switch(D){case $s:t.blendFuncSeparate(t.ONE,t.ONE_MINUS_SRC_ALPHA,t.ONE,t.ONE_MINUS_SRC_ALPHA);break;case Ks:t.blendFunc(t.ONE,t.ONE);break;case cl:t.blendFuncSeparate(t.ZERO,t.ONE_MINUS_SRC_COLOR,t.ZERO,t.ONE);break;case hl:t.blendFuncSeparate(t.DST_COLOR,t.ONE_MINUS_SRC_ALPHA,t.ZERO,t.ONE);break;default:Lt("WebGLState: Invalid blending: ",D);break}else switch(D){case $s:t.blendFuncSeparate(t.SRC_ALPHA,t.ONE_MINUS_SRC_ALPHA,t.ONE,t.ONE_MINUS_SRC_ALPHA);break;case Ks:t.blendFuncSeparate(t.SRC_ALPHA,t.ONE,t.ONE,t.ONE);break;case cl:Lt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case hl:Lt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Lt("WebGLState: Invalid blending: ",D);break}E=null,x=null,C=null,w=null,v.set(0,0,0),b=0,p=D,O=oe}return}if(Et=Et||pt,nt=nt||Y,vt=vt||mt,pt!==S||Et!==T)t.blendEquationSeparate(tt[pt],tt[Et]),S=pt,T=Et;if(Y!==E||mt!==x||nt!==C||vt!==w)t.blendFuncSeparate(st[Y],st[mt],st[nt],st[vt]),E=Y,x=mt,C=nt,w=vt;if(Zt.equals(v)===!1||_e!==b)t.blendColor(Zt.r,Zt.g,Zt.b,_e),v.copy(Zt),b=_e;p=D,O=!1}function ct(D,pt){D.side===wn?Ot(t.CULL_FACE):rt(t.CULL_FACE);let Y=D.side===Ke;if(pt)Y=!Y;St(Y),D.blending===$s&&D.transparent===!1?ot(Cn):ot(D.blending,D.blendEquation,D.blendSrc,D.blendDst,D.blendEquationAlpha,D.blendSrcAlpha,D.blendDstAlpha,D.blendColor,D.blendAlpha,D.premultipliedAlpha),a.setFunc(D.depthFunc),a.setTest(D.depthTest),a.setMask(D.depthWrite),r.setMask(D.colorWrite);let mt=D.stencilWrite;if(o.setTest(mt),mt)o.setMask(D.stencilWriteMask),o.setFunc(D.stencilFunc,D.stencilRef,D.stencilFuncMask),o.setOp(D.stencilFail,D.stencilZFail,D.stencilZPass);qt(D.polygonOffset,D.polygonOffsetFactor,D.polygonOffsetUnits),D.alphaToCoverage===!0?rt(t.SAMPLE_ALPHA_TO_COVERAGE):Ot(t.SAMPLE_ALPHA_TO_COVERAGE)}function St(D){if(L!==D){if(D)t.frontFace(t.CW);else t.frontFace(t.CCW);L=D}}function Nt(D){if(D!==zu){if(rt(t.CULL_FACE),D!==F)if(D===ll)t.cullFace(t.BACK);else if(D===Gu)t.cullFace(t.FRONT);else t.cullFace(t.FRONT_AND_BACK)}else Ot(t.CULL_FACE);F=D}function Bt(D){if(D!==Z){if(k)t.lineWidth(D);Z=D}}function qt(D,pt,Y){if(D){if(rt(t.POLYGON_OFFSET_FILL),P!==pt||G!==Y){if(P=pt,G=Y,a.getReversed())pt=-pt;t.polygonOffset(pt,Y)}}else Ot(t.POLYGON_OFFSET_FILL)}function Yt(D){if(D)rt(t.SCISSOR_TEST);else Ot(t.SCISSOR_TEST)}function I(D){if(D===void 0)D=t.TEXTURE0+J-1;if(Q!==D)t.activeTexture(D),Q=D}function fe(D,pt,Y){if(Y===void 0)if(Q===null)Y=t.TEXTURE0+J-1;else Y=Q;let mt=it[Y];if(mt===void 0)mt={type:void 0,texture:void 0},it[Y]=mt;if(mt.type!==D||mt.texture!==pt){if(Q!==Y)t.activeTexture(Y),Q=Y;t.bindTexture(D,pt||lt[D]),mt.type=D,mt.texture=pt}}function jt(){let D=it[Q];if(D!==void 0&&D.type!==void 0)t.bindTexture(D.type,null),D.type=void 0,D.texture=void 0}function te(){try{t.compressedTexImage2D(...arguments)}catch(D){Lt("WebGLState:",D)}}function A(){try{t.compressedTexImage3D(...arguments)}catch(D){Lt("WebGLState:",D)}}function y(){try{t.texSubImage2D(...arguments)}catch(D){Lt("WebGLState:",D)}}function N(){try{t.texSubImage3D(...arguments)}catch(D){Lt("WebGLState:",D)}}function H(){try{t.compressedTexSubImage2D(...arguments)}catch(D){Lt("WebGLState:",D)}}function et(){try{t.compressedTexSubImage3D(...arguments)}catch(D){Lt("WebGLState:",D)}}function ht(){try{t.texStorage2D(...arguments)}catch(D){Lt("WebGLState:",D)}}function ft(){try{t.texStorage3D(...arguments)}catch(D){Lt("WebGLState:",D)}}function X(){try{t.texImage2D(...arguments)}catch(D){Lt("WebGLState:",D)}}function K(){try{t.texImage3D(...arguments)}catch(D){Lt("WebGLState:",D)}}function bt(D){if(d[D]!==void 0)return d[D];else return t.getParameter(D)}function Ut(D,pt){if(d[D]!==pt)t.pixelStorei(D,pt),d[D]=pt}function gt(D){if(he.equals(D)===!1)t.scissor(D.x,D.y,D.z,D.w),he.copy(D)}function ut(D){if($t.equals(D)===!1)t.viewport(D.x,D.y,D.z,D.w),$t.copy(D)}function zt(D,pt){let Y=c.get(pt);if(Y===void 0)Y=new WeakMap,c.set(pt,Y);let mt=Y.get(D);if(mt===void 0)mt=t.getUniformBlockIndex(pt,D.name),Y.set(D,mt)}function kt(D,pt){let mt=c.get(pt).get(D);if(l.get(pt)!==mt)t.uniformBlockBinding(pt,mt,D.__bindingPointIndex),l.set(pt,mt)}function ae(){t.disable(t.BLEND),t.disable(t.CULL_FACE),t.disable(t.DEPTH_TEST),t.disable(t.POLYGON_OFFSET_FILL),t.disable(t.SCISSOR_TEST),t.disable(t.STENCIL_TEST),t.disable(t.SAMPLE_ALPHA_TO_COVERAGE),t.blendEquation(t.FUNC_ADD),t.blendFunc(t.ONE,t.ZERO),t.blendFuncSeparate(t.ONE,t.ZERO,t.ONE,t.ZERO),t.blendColor(0,0,0,0),t.colorMask(!0,!0,!0,!0),t.clearColor(0,0,0,0),t.depthMask(!0),t.depthFunc(t.LESS),a.setReversed(!1),t.clearDepth(1),t.stencilMask(4294967295),t.stencilFunc(t.ALWAYS,0,4294967295),t.stencilOp(t.KEEP,t.KEEP,t.KEEP),t.clearStencil(0),t.cullFace(t.BACK),t.frontFace(t.CCW),t.polygonOffset(0,0),t.activeTexture(t.TEXTURE0),t.bindFramebuffer(t.FRAMEBUFFER,null),t.bindFramebuffer(t.DRAW_FRAMEBUFFER,null),t.bindFramebuffer(t.READ_FRAMEBUFFER,null),t.useProgram(null),t.lineWidth(1),t.scissor(0,0,t.canvas.width,t.canvas.height),t.viewport(0,0,t.canvas.width,t.canvas.height),t.pixelStorei(t.PACK_ALIGNMENT,4),t.pixelStorei(t.UNPACK_ALIGNMENT,4),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),t.pixelStorei(t.UNPACK_COLORSPACE_CONVERSION_WEBGL,t.BROWSER_DEFAULT_WEBGL),t.pixelStorei(t.PACK_ROW_LENGTH,0),t.pixelStorei(t.PACK_SKIP_PIXELS,0),t.pixelStorei(t.PACK_SKIP_ROWS,0),t.pixelStorei(t.UNPACK_ROW_LENGTH,0),t.pixelStorei(t.UNPACK_IMAGE_HEIGHT,0),t.pixelStorei(t.UNPACK_SKIP_PIXELS,0),t.pixelStorei(t.UNPACK_SKIP_ROWS,0),t.pixelStorei(t.UNPACK_SKIP_IMAGES,0),h={},d={},Q=null,it={},u={},f=new WeakMap,m=[],_=null,g=!1,p=null,S=null,E=null,x=null,T=null,C=null,w=null,v=new _t(0,0,0),b=0,O=!1,L=null,F=null,Z=null,P=null,G=null,he.set(0,0,t.canvas.width,t.canvas.height),$t.set(0,0,t.canvas.width,t.canvas.height),r.reset(),a.reset(),o.reset()}return{buffers:{color:r,depth:a,stencil:o},enable:rt,disable:Ot,bindFramebuffer:Gt,drawBuffers:Ct,useProgram:ue,setBlending:ot,setMaterial:ct,setFlipSided:St,setCullFace:Nt,setLineWidth:Bt,setPolygonOffset:qt,setScissorTest:Yt,activeTexture:I,bindTexture:fe,unbindTexture:jt,compressedTexImage2D:te,compressedTexImage3D:A,texImage2D:X,texImage3D:K,pixelStorei:Ut,getParameter:bt,updateUBOMapping:zt,uniformBlockBinding:kt,texStorage2D:ht,texStorage3D:ft,texSubImage2D:y,texSubImage3D:N,compressedTexSubImage2D:H,compressedTexSubImage3D:et,scissor:gt,viewport:ut,reset:ae}}function WS(t,e,n,i,s,r,a){let o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new j,h=new WeakMap,d=new Set,u,f=new WeakMap,m=!1;try{m=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch(A){}function _(A,y){return m?new OffscreenCanvas(A,y):cs("canvas")}function g(A,y,N){let H=1,et=te(A);if(et.width>N||et.height>N)H=N/Math.max(et.width,et.height);if(H<1)if(typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&A instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&A instanceof ImageBitmap||typeof VideoFrame<"u"&&A instanceof VideoFrame){let ht=Math.floor(H*et.width),ft=Math.floor(H*et.height);if(u===void 0)u=_(ht,ft);let X=y?_(ht,ft):u;return X.width=ht,X.height=ft,X.getContext("2d").drawImage(A,0,0,ht,ft),dt("WebGLRenderer: Texture has been resized from ("+et.width+"x"+et.height+") to ("+ht+"x"+ft+")."),X}else{if("data"in A)dt("WebGLRenderer: Image in DataTexture is too big ("+et.width+"x"+et.height+").");return A}return A}function p(A){return A.generateMipmaps}function S(A){t.generateMipmap(A)}function E(A){if(A.isWebGLCubeRenderTarget)return t.TEXTURE_CUBE_MAP;if(A.isWebGL3DRenderTarget)return t.TEXTURE_3D;if(A.isWebGLArrayRenderTarget||A.isCompressedArrayTexture)return t.TEXTURE_2D_ARRAY;return t.TEXTURE_2D}function x(A,y,N,H,et,ht=!1){if(A!==null){if(t[A]!==void 0)return t[A];dt("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+A+"'")}let ft;if(H){if(ft=e.get("EXT_texture_norm16"),!ft)dt("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension")}let X=y;if(y===t.RED){if(N===t.FLOAT)X=t.R32F;if(N===t.HALF_FLOAT)X=t.R16F;if(N===t.UNSIGNED_BYTE)X=t.R8;if(N===t.UNSIGNED_SHORT&&ft)X=ft.R16_EXT;if(N===t.SHORT&&ft)X=ft.R16_SNORM_EXT}if(y===t.RED_INTEGER){if(N===t.UNSIGNED_BYTE)X=t.R8UI;if(N===t.UNSIGNED_SHORT)X=t.R16UI;if(N===t.UNSIGNED_INT)X=t.R32UI;if(N===t.BYTE)X=t.R8I;if(N===t.SHORT)X=t.R16I;if(N===t.INT)X=t.R32I}if(y===t.RG){if(N===t.FLOAT)X=t.RG32F;if(N===t.HALF_FLOAT)X=t.RG16F;if(N===t.UNSIGNED_BYTE)X=t.RG8;if(N===t.UNSIGNED_SHORT&&ft)X=ft.RG16_EXT;if(N===t.SHORT&&ft)X=ft.RG16_SNORM_EXT}if(y===t.RG_INTEGER){if(N===t.UNSIGNED_BYTE)X=t.RG8UI;if(N===t.UNSIGNED_SHORT)X=t.RG16UI;if(N===t.UNSIGNED_INT)X=t.RG32UI;if(N===t.BYTE)X=t.RG8I;if(N===t.SHORT)X=t.RG16I;if(N===t.INT)X=t.RG32I}if(y===t.RGB_INTEGER){if(N===t.UNSIGNED_BYTE)X=t.RGB8UI;if(N===t.UNSIGNED_SHORT)X=t.RGB16UI;if(N===t.UNSIGNED_INT)X=t.RGB32UI;if(N===t.BYTE)X=t.RGB8I;if(N===t.SHORT)X=t.RGB16I;if(N===t.INT)X=t.RGB32I}if(y===t.RGBA_INTEGER){if(N===t.UNSIGNED_BYTE)X=t.RGBA8UI;if(N===t.UNSIGNED_SHORT)X=t.RGBA16UI;if(N===t.UNSIGNED_INT)X=t.RGBA32UI;if(N===t.BYTE)X=t.RGBA8I;if(N===t.SHORT)X=t.RGBA16I;if(N===t.INT)X=t.RGBA32I}if(y===t.RGB){if(N===t.UNSIGNED_SHORT&&ft)X=ft.RGB16_EXT;if(N===t.SHORT&&ft)X=ft.RGB16_SNORM_EXT;if(N===t.UNSIGNED_INT_5_9_9_9_REV)X=t.RGB9_E5;if(N===t.UNSIGNED_INT_10F_11F_11F_REV)X=t.R11F_G11F_B10F}if(y===t.RGBA){let K=ht?ic:ne.getTransfer(et);if(N===t.FLOAT)X=t.RGBA32F;if(N===t.HALF_FLOAT)X=t.RGBA16F;if(N===t.UNSIGNED_BYTE)X=K===ge?t.SRGB8_ALPHA8:t.RGBA8;if(N===t.UNSIGNED_SHORT&&ft)X=ft.RGBA16_EXT;if(N===t.SHORT&&ft)X=ft.RGBA16_SNORM_EXT;if(N===t.UNSIGNED_SHORT_4_4_4_4)X=t.RGBA4;if(N===t.UNSIGNED_SHORT_5_5_5_1)X=t.RGB5_A1}if(X===t.R16F||X===t.R32F||X===t.RG16F||X===t.RG32F||X===t.RGBA16F||X===t.RGBA32F)e.get("EXT_color_buffer_float");return X}function T(A,y){let N;if(A){if(y===null||y===ri||y===xs)N=t.DEPTH24_STENCIL8;else if(y===Vn)N=t.DEPTH32F_STENCIL8;else if(y===tr)N=t.DEPTH24_STENCIL8,dt("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")}else if(y===null||y===ri||y===xs)N=t.DEPTH_COMPONENT24;else if(y===Vn)N=t.DEPTH_COMPONENT32F;else if(y===tr)N=t.DEPTH_COMPONENT16;return N}function C(A,y){if(p(A)===!0||A.isFramebufferTexture&&A.minFilter!==si&&A.minFilter!==Qe)return Math.log2(Math.max(y.width,y.height))+1;else if(A.mipmaps!==void 0&&A.mipmaps.length>0)return A.mipmaps.length;else if(A.isCompressedTexture&&Array.isArray(A.image))return y.mipmaps.length;else return 1}function w(A){let y=A.target;if(y.removeEventListener("dispose",w),b(y),y.isVideoTexture)h.delete(y);if(y.isHTMLTexture)d.delete(y)}function v(A){let y=A.target;y.removeEventListener("dispose",v),L(y)}function b(A){let y=i.get(A);if(y.__webglInit===void 0)return;let N=A.source,H=f.get(N);if(H){let et=H[y.__cacheKey];if(et.usedTimes--,et.usedTimes===0)O(A);if(Object.keys(H).length===0)f.delete(N)}i.remove(A)}function O(A){let y=i.get(A);t.deleteTexture(y.__webglTexture);let N=A.source,H=f.get(N);delete H[y.__cacheKey],a.memory.textures--}function L(A){let y=i.get(A);if(A.depthTexture)A.depthTexture.dispose(),i.remove(A.depthTexture);if(A.isWebGLCubeRenderTarget)for(let H=0;H<6;H++){if(Array.isArray(y.__webglFramebuffer[H]))for(let et=0;et<y.__webglFramebuffer[H].length;et++)t.deleteFramebuffer(y.__webglFramebuffer[H][et]);else t.deleteFramebuffer(y.__webglFramebuffer[H]);if(y.__webglDepthbuffer)t.deleteRenderbuffer(y.__webglDepthbuffer[H])}else{if(Array.isArray(y.__webglFramebuffer))for(let H=0;H<y.__webglFramebuffer.length;H++)t.deleteFramebuffer(y.__webglFramebuffer[H]);else t.deleteFramebuffer(y.__webglFramebuffer);if(y.__webglDepthbuffer)t.deleteRenderbuffer(y.__webglDepthbuffer);if(y.__webglMultisampledFramebuffer)t.deleteFramebuffer(y.__webglMultisampledFramebuffer);if(y.__webglColorRenderbuffer){for(let H=0;H<y.__webglColorRenderbuffer.length;H++)if(y.__webglColorRenderbuffer[H])t.deleteRenderbuffer(y.__webglColorRenderbuffer[H])}if(y.__webglDepthRenderbuffer)t.deleteRenderbuffer(y.__webglDepthRenderbuffer)}let N=A.textures;for(let H=0,et=N.length;H<et;H++){let ht=i.get(N[H]);if(ht.__webglTexture)t.deleteTexture(ht.__webglTexture),a.memory.textures--;i.remove(N[H])}i.remove(A)}let F=0;function Z(){F=0}function P(){return F}function G(A){F=A}function J(){let A=F;if(A>=s.maxTextures)dt("WebGLTextures: Trying to use "+(A+1)+" texture units while this GPU supports only "+s.maxTextures);return F+=1,A}function k(A){let y=[];return y.push(A.wrapS),y.push(A.wrapT),y.push(A.wrapR||0),y.push(A.magFilter),y.push(A.minFilter),y.push(A.anisotropy),y.push(A.internalFormat),y.push(A.format),y.push(A.type),y.push(A.generateMipmaps),y.push(A.premultiplyAlpha),y.push(A.flipY),y.push(A.unpackAlignment),y.push(A.colorSpace),y.join()}function at(A,y){let N=i.get(A);if(A.isVideoTexture)fe(A);if(A.isRenderTargetTexture===!1&&A.isExternalTexture!==!0&&A.version>0&&N.__version!==A.version){let H=A.image;if(H===null)dt("WebGLRenderer: Texture marked for update but no image data found.");else if(H.complete===!1)dt("WebGLRenderer: Texture marked for update but image is incomplete");else{Ot(N,A,y);return}}else if(A.isExternalTexture)N.__webglTexture=A.sourceTexture?A.sourceTexture:null;n.bindTexture(t.TEXTURE_2D,N.__webglTexture,t.TEXTURE0+y)}function W(A,y){let N=i.get(A);if(A.isRenderTargetTexture===!1&&A.version>0&&N.__version!==A.version){Ot(N,A,y);return}else if(A.isExternalTexture)N.__webglTexture=A.sourceTexture?A.sourceTexture:null;n.bindTexture(t.TEXTURE_2D_ARRAY,N.__webglTexture,t.TEXTURE0+y)}function Q(A,y){let N=i.get(A);if(A.isRenderTargetTexture===!1&&A.version>0&&N.__version!==A.version){Ot(N,A,y);return}n.bindTexture(t.TEXTURE_3D,N.__webglTexture,t.TEXTURE0+y)}function it(A,y){let N=i.get(A);if(A.isCubeDepthTexture!==!0&&A.version>0&&N.__version!==A.version){Gt(N,A,y);return}n.bindTexture(t.TEXTURE_CUBE_MAP,N.__webglTexture,t.TEXTURE0+y)}let Dt={[xd]:t.REPEAT,[_a]:t.CLAMP_TO_EDGE,[vd]:t.MIRRORED_REPEAT},Ft={[si]:t.NEAREST,[yd]:t.NEAREST_MIPMAP_NEAREST,[js]:t.NEAREST_MIPMAP_LINEAR,[Qe]:t.LINEAR,[xa]:t.LINEAR_MIPMAP_NEAREST,[Ci]:t.LINEAR_MIPMAP_LINEAR},he={[Nd]:t.NEVER,[Bd]:t.ALWAYS,[Ud]:t.LESS,[Ea]:t.LEQUAL,[Dd]:t.EQUAL,[Aa]:t.GEQUAL,[Fd]:t.GREATER,[Od]:t.NOTEQUAL};function $t(A,y){if(y.type===Vn&&e.has("OES_texture_float_linear")===!1&&(y.magFilter===Qe||y.magFilter===xa||y.magFilter===js||y.magFilter===Ci||y.minFilter===Qe||y.minFilter===xa||y.minFilter===js||y.minFilter===Ci))dt("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.");if(t.texParameteri(A,t.TEXTURE_WRAP_S,Dt[y.wrapS]),t.texParameteri(A,t.TEXTURE_WRAP_T,Dt[y.wrapT]),A===t.TEXTURE_3D||A===t.TEXTURE_2D_ARRAY)t.texParameteri(A,t.TEXTURE_WRAP_R,Dt[y.wrapR]);if(t.texParameteri(A,t.TEXTURE_MAG_FILTER,Ft[y.magFilter]),t.texParameteri(A,t.TEXTURE_MIN_FILTER,Ft[y.minFilter]),y.compareFunction)t.texParameteri(A,t.TEXTURE_COMPARE_MODE,t.COMPARE_REF_TO_TEXTURE),t.texParameteri(A,t.TEXTURE_COMPARE_FUNC,he[y.compareFunction]);if(e.has("EXT_texture_filter_anisotropic")===!0){if(y.magFilter===si)return;if(y.minFilter!==js&&y.minFilter!==Ci)return;if(y.type===Vn&&e.has("OES_texture_float_linear")===!1)return;if(y.anisotropy>1||i.get(y).__currentAnisotropy){let N=e.get("EXT_texture_filter_anisotropic");t.texParameterf(A,N.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(y.anisotropy,s.getMaxAnisotropy())),i.get(y).__currentAnisotropy=y.anisotropy}}}function q(A,y){let N=!1;if(A.__webglInit===void 0)A.__webglInit=!0,y.addEventListener("dispose",w);let H=y.source,et=f.get(H);if(et===void 0)et={},f.set(H,et);let ht=k(y);if(ht!==A.__cacheKey){if(et[ht]===void 0)et[ht]={texture:t.createTexture(),usedTimes:0},a.memory.textures++,N=!0;et[ht].usedTimes++;let ft=et[A.__cacheKey];if(ft!==void 0){if(et[A.__cacheKey].usedTimes--,ft.usedTimes===0)O(y)}A.__cacheKey=ht,A.__webglTexture=et[ht].texture}return N}function lt(A,y,N){return Math.floor(Math.floor(A/N)/y)}function rt(A,y,N,H){let ht=A.updateRanges;if(ht.length===0)n.texSubImage2D(t.TEXTURE_2D,0,0,0,y.width,y.height,N,H,y.data);else{ht.sort((Ut,gt)=>Ut.start-gt.start);let ft=0;for(let Ut=1;Ut<ht.length;Ut++){let gt=ht[ft],ut=ht[Ut],zt=gt.start+gt.count,kt=lt(ut.start,y.width,4),ae=lt(gt.start,y.width,4);if(ut.start<=zt+1&&kt===ae&&lt(ut.start+ut.count-1,y.width,4)===kt)gt.count=Math.max(gt.count,ut.start+ut.count-gt.start);else++ft,ht[ft]=ut}ht.length=ft+1;let X=n.getParameter(t.UNPACK_ROW_LENGTH),K=n.getParameter(t.UNPACK_SKIP_PIXELS),bt=n.getParameter(t.UNPACK_SKIP_ROWS);n.pixelStorei(t.UNPACK_ROW_LENGTH,y.width);for(let Ut=0,gt=ht.length;Ut<gt;Ut++){let ut=ht[Ut],zt=Math.floor(ut.start/4),kt=Math.ceil(ut.count/4),ae=zt%y.width,D=Math.floor(zt/y.width),pt=kt,Y=1;n.pixelStorei(t.UNPACK_SKIP_PIXELS,ae),n.pixelStorei(t.UNPACK_SKIP_ROWS,D),n.texSubImage2D(t.TEXTURE_2D,0,ae,D,pt,1,N,H,y.data)}A.clearUpdateRanges(),n.pixelStorei(t.UNPACK_ROW_LENGTH,X),n.pixelStorei(t.UNPACK_SKIP_PIXELS,K),n.pixelStorei(t.UNPACK_SKIP_ROWS,bt)}}function Ot(A,y,N){let H=t.TEXTURE_2D;if(y.isDataArrayTexture||y.isCompressedArrayTexture)H=t.TEXTURE_2D_ARRAY;if(y.isData3DTexture)H=t.TEXTURE_3D;let et=q(A,y),ht=y.source;n.bindTexture(H,A.__webglTexture,t.TEXTURE0+N);let ft=i.get(ht);if(ht.version!==ft.__version||et===!0){if(n.activeTexture(t.TEXTURE0+N),(typeof ImageBitmap<"u"&&y.image instanceof ImageBitmap)===!1){let Y=ne.getPrimaries(ne.workingColorSpace),mt=y.colorSpace===Li?null:ne.getPrimaries(y.colorSpace),Et=y.colorSpace===Li||Y===mt?t.NONE:t.BROWSER_DEFAULT_WEBGL;n.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,y.flipY),n.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,y.premultiplyAlpha),n.pixelStorei(t.UNPACK_COLORSPACE_CONVERSION_WEBGL,Et)}n.pixelStorei(t.UNPACK_ALIGNMENT,y.unpackAlignment);let K=g(y.image,!1,s.maxTextureSize);K=jt(y,K);let bt=r.convert(y.format,y.colorSpace),Ut=r.convert(y.type),gt=x(y.internalFormat,bt,Ut,y.normalized,y.colorSpace,y.isVideoTexture);$t(H,y);let ut,zt=y.mipmaps,kt=y.isVideoTexture!==!0,ae=ft.__version===void 0||et===!0,D=ht.dataReady,pt=C(y,K);if(y.isDepthTexture){if(gt=T(y.format===Ii,y.type),ae)if(kt)n.texStorage2D(t.TEXTURE_2D,1,gt,K.width,K.height);else n.texImage2D(t.TEXTURE_2D,0,gt,K.width,K.height,0,bt,Ut,null)}else if(y.isDataTexture)if(zt.length>0){if(kt&&ae)n.texStorage2D(t.TEXTURE_2D,pt,gt,zt[0].width,zt[0].height);for(let Y=0,mt=zt.length;Y<mt;Y++)if(ut=zt[Y],kt){if(D)n.texSubImage2D(t.TEXTURE_2D,Y,0,0,ut.width,ut.height,bt,Ut,ut.data)}else n.texImage2D(t.TEXTURE_2D,Y,gt,ut.width,ut.height,0,bt,Ut,ut.data);y.generateMipmaps=!1}else if(kt){if(ae)n.texStorage2D(t.TEXTURE_2D,pt,gt,K.width,K.height);if(D)rt(y,K,bt,Ut)}else n.texImage2D(t.TEXTURE_2D,0,gt,K.width,K.height,0,bt,Ut,K.data);else if(y.isCompressedTexture)if(y.isCompressedArrayTexture){if(kt&&ae)n.texStorage3D(t.TEXTURE_2D_ARRAY,pt,gt,zt[0].width,zt[0].height,K.depth);for(let Y=0,mt=zt.length;Y<mt;Y++)if(ut=zt[Y],y.format!==Rn)if(bt!==null)if(kt){if(D)if(y.layerUpdates.size>0){let Et=fo(ut.width,ut.height,y.format,y.type);for(let nt of y.layerUpdates){let vt=ut.data.subarray(nt*Et/ut.data.BYTES_PER_ELEMENT,(nt+1)*Et/ut.data.BYTES_PER_ELEMENT);n.compressedTexSubImage3D(t.TEXTURE_2D_ARRAY,Y,0,0,nt,ut.width,ut.height,1,bt,vt)}}else n.compressedTexSubImage3D(t.TEXTURE_2D_ARRAY,Y,0,0,0,ut.width,ut.height,K.depth,bt,ut.data)}else n.compressedTexImage3D(t.TEXTURE_2D_ARRAY,Y,gt,ut.width,ut.height,K.depth,0,ut.data,0,0);else dt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else if(kt){if(D)n.texSubImage3D(t.TEXTURE_2D_ARRAY,Y,0,0,0,ut.width,ut.height,K.depth,bt,Ut,ut.data)}else n.texImage3D(t.TEXTURE_2D_ARRAY,Y,gt,ut.width,ut.height,K.depth,0,bt,Ut,ut.data);if(y.layerUpdates.size>0)y.clearLayerUpdates()}else{if(kt&&ae)n.texStorage2D(t.TEXTURE_2D,pt,gt,zt[0].width,zt[0].height);for(let Y=0,mt=zt.length;Y<mt;Y++)if(ut=zt[Y],y.format!==Rn)if(bt!==null)if(kt){if(D)n.compressedTexSubImage2D(t.TEXTURE_2D,Y,0,0,ut.width,ut.height,bt,ut.data)}else n.compressedTexImage2D(t.TEXTURE_2D,Y,gt,ut.width,ut.height,0,ut.data);else dt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else if(kt){if(D)n.texSubImage2D(t.TEXTURE_2D,Y,0,0,ut.width,ut.height,bt,Ut,ut.data)}else n.texImage2D(t.TEXTURE_2D,Y,gt,ut.width,ut.height,0,bt,Ut,ut.data)}else if(y.isDataArrayTexture)if(kt){if(ae)n.texStorage3D(t.TEXTURE_2D_ARRAY,pt,gt,K.width,K.height,K.depth);if(D)if(y.layerUpdates.size>0){let Y=fo(K.width,K.height,y.format,y.type);for(let mt of y.layerUpdates){let Et=K.data.subarray(mt*Y/K.data.BYTES_PER_ELEMENT,(mt+1)*Y/K.data.BYTES_PER_ELEMENT);n.texSubImage3D(t.TEXTURE_2D_ARRAY,0,0,0,mt,K.width,K.height,1,bt,Ut,Et)}y.clearLayerUpdates()}else n.texSubImage3D(t.TEXTURE_2D_ARRAY,0,0,0,0,K.width,K.height,K.depth,bt,Ut,K.data)}else n.texImage3D(t.TEXTURE_2D_ARRAY,0,gt,K.width,K.height,K.depth,0,bt,Ut,K.data);else if(y.isData3DTexture)if(kt){if(ae)n.texStorage3D(t.TEXTURE_3D,pt,gt,K.width,K.height,K.depth);if(D)n.texSubImage3D(t.TEXTURE_3D,0,0,0,0,K.width,K.height,K.depth,bt,Ut,K.data)}else n.texImage3D(t.TEXTURE_3D,0,gt,K.width,K.height,K.depth,0,bt,Ut,K.data);else if(y.isFramebufferTexture){if(ae)if(kt)n.texStorage2D(t.TEXTURE_2D,pt,gt,K.width,K.height);else{let Y=K.width,mt=K.height;for(let Et=0;Et<pt;Et++)n.texImage2D(t.TEXTURE_2D,Et,gt,Y,mt,0,bt,Ut,null),Y>>=1,mt>>=1}}else if(y.isHTMLTexture){if("texElementImage2D"in t){let Y=t.canvas;if(!Y.hasAttribute("layoutsubtree"))Y.setAttribute("layoutsubtree","true");if(K.parentNode!==Y){Y.appendChild(K),d.add(y),Y.onpaint=(mt)=>{let Et=mt.changedElements;for(let nt of d)if(Et.includes(nt.image))nt.needsUpdate=!0},Y.requestPaint();return}if(t.texElementImage2D.length===3)t.texElementImage2D(t.TEXTURE_2D,t.RGBA8,K);else{let{RGBA:Et,RGBA:nt,UNSIGNED_BYTE:vt}=t;t.texElementImage2D(t.TEXTURE_2D,0,Et,nt,vt,K)}t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE)}}else if(zt.length>0){if(kt&&ae){let Y=te(zt[0]);n.texStorage2D(t.TEXTURE_2D,pt,gt,Y.width,Y.height)}for(let Y=0,mt=zt.length;Y<mt;Y++)if(ut=zt[Y],kt){if(D)n.texSubImage2D(t.TEXTURE_2D,Y,0,0,bt,Ut,ut)}else n.texImage2D(t.TEXTURE_2D,Y,gt,bt,Ut,ut);y.generateMipmaps=!1}else if(kt){if(ae){let Y=te(K);n.texStorage2D(t.TEXTURE_2D,pt,gt,Y.width,Y.height)}if(D)n.texSubImage2D(t.TEXTURE_2D,0,0,0,bt,Ut,K)}else n.texImage2D(t.TEXTURE_2D,0,gt,bt,Ut,K);if(p(y))S(H);if(ft.__version=ht.version,y.onUpdate)y.onUpdate(y)}A.__version=y.version}function Gt(A,y,N){if(y.image.length!==6)return;let H=q(A,y),et=y.source;n.bindTexture(t.TEXTURE_CUBE_MAP,A.__webglTexture,t.TEXTURE0+N);let ht=i.get(et);if(et.version!==ht.__version||H===!0){n.activeTexture(t.TEXTURE0+N);let ft=ne.getPrimaries(ne.workingColorSpace),X=y.colorSpace===Li?null:ne.getPrimaries(y.colorSpace),K=y.colorSpace===Li||ft===X?t.NONE:t.BROWSER_DEFAULT_WEBGL;n.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,y.flipY),n.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,y.premultiplyAlpha),n.pixelStorei(t.UNPACK_ALIGNMENT,y.unpackAlignment),n.pixelStorei(t.UNPACK_COLORSPACE_CONVERSION_WEBGL,K);let bt=y.isCompressedTexture||y.image[0].isCompressedTexture,Ut=y.image[0]&&y.image[0].isDataTexture,gt=[];for(let nt=0;nt<6;nt++){if(!bt&&!Ut)gt[nt]=g(y.image[nt],!0,s.maxCubemapSize);else gt[nt]=Ut?y.image[nt].image:y.image[nt];gt[nt]=jt(y,gt[nt])}let ut=gt[0],zt=r.convert(y.format,y.colorSpace),kt=r.convert(y.type),ae=x(y.internalFormat,zt,kt,y.normalized,y.colorSpace),D=y.isVideoTexture!==!0,pt=ht.__version===void 0||H===!0,Y=et.dataReady,mt=C(y,ut);$t(t.TEXTURE_CUBE_MAP,y);let Et;if(bt){if(D&&pt)n.texStorage2D(t.TEXTURE_CUBE_MAP,mt,ae,ut.width,ut.height);for(let nt=0;nt<6;nt++){Et=gt[nt].mipmaps;for(let vt=0;vt<Et.length;vt++){let Zt=Et[vt];if(y.format!==Rn)if(zt!==null)if(D){if(Y)n.compressedTexSubImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+nt,vt,0,0,Zt.width,Zt.height,zt,Zt.data)}else n.compressedTexImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+nt,vt,ae,Zt.width,Zt.height,0,Zt.data);else dt("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()");else if(D){if(Y)n.texSubImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+nt,vt,0,0,Zt.width,Zt.height,zt,kt,Zt.data)}else n.texImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+nt,vt,ae,Zt.width,Zt.height,0,zt,kt,Zt.data)}}}else{if(Et=y.mipmaps,D&&pt){if(Et.length>0)mt++;let nt=te(gt[0]);n.texStorage2D(t.TEXTURE_CUBE_MAP,mt,ae,nt.width,nt.height)}for(let nt=0;nt<6;nt++)if(Ut){if(D){if(Y)n.texSubImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+nt,0,0,0,gt[nt].width,gt[nt].height,zt,kt,gt[nt].data)}else n.texImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+nt,0,ae,gt[nt].width,gt[nt].height,0,zt,kt,gt[nt].data);for(let vt=0;vt<Et.length;vt++){let _e=Et[vt].image[nt].image;if(D){if(Y)n.texSubImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+nt,vt+1,0,0,_e.width,_e.height,zt,kt,_e.data)}else n.texImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+nt,vt+1,ae,_e.width,_e.height,0,zt,kt,_e.data)}}else{if(D){if(Y)n.texSubImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+nt,0,0,0,zt,kt,gt[nt])}else n.texImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+nt,0,ae,zt,kt,gt[nt]);for(let vt=0;vt<Et.length;vt++){let Zt=Et[vt];if(D){if(Y)n.texSubImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+nt,vt+1,0,0,zt,kt,Zt.image[nt])}else n.texImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+nt,vt+1,ae,zt,kt,Zt.image[nt])}}}if(p(y))S(t.TEXTURE_CUBE_MAP);if(ht.__version=et.version,y.onUpdate)y.onUpdate(y)}A.__version=y.version}function Ct(A,y,N,H,et,ht){let ft=r.convert(N.format,N.colorSpace),X=r.convert(N.type),K=x(N.internalFormat,ft,X,N.normalized,N.colorSpace),bt=i.get(y),Ut=i.get(N);if(Ut.__renderTarget=y,!bt.__hasExternalTextures){let gt=Math.max(1,y.width>>ht),ut=Math.max(1,y.height>>ht);if(et===t.TEXTURE_3D||et===t.TEXTURE_2D_ARRAY)n.texImage3D(et,ht,K,gt,ut,y.depth,0,ft,X,null);else n.texImage2D(et,ht,K,gt,ut,0,ft,X,null)}if(n.bindFramebuffer(t.FRAMEBUFFER,A),I(y))o.framebufferTexture2DMultisampleEXT(t.FRAMEBUFFER,H,et,Ut.__webglTexture,0,Yt(y));else if(et===t.TEXTURE_2D||et>=t.TEXTURE_CUBE_MAP_POSITIVE_X&&et<=t.TEXTURE_CUBE_MAP_NEGATIVE_Z)t.framebufferTexture2D(t.FRAMEBUFFER,H,et,Ut.__webglTexture,ht);n.bindFramebuffer(t.FRAMEBUFFER,null)}function ue(A,y,N){if(t.bindRenderbuffer(t.RENDERBUFFER,A),y.depthBuffer){let H=y.depthTexture,et=H&&H.isDepthTexture?H.type:null,ht=T(y.stencilBuffer,et),ft=y.stencilBuffer?t.DEPTH_STENCIL_ATTACHMENT:t.DEPTH_ATTACHMENT;if(I(y))o.renderbufferStorageMultisampleEXT(t.RENDERBUFFER,Yt(y),ht,y.width,y.height);else if(N)t.renderbufferStorageMultisample(t.RENDERBUFFER,Yt(y),ht,y.width,y.height);else t.renderbufferStorage(t.RENDERBUFFER,ht,y.width,y.height);t.framebufferRenderbuffer(t.FRAMEBUFFER,ft,t.RENDERBUFFER,A)}else{let H=y.textures;for(let et=0;et<H.length;et++){let ht=H[et],ft=r.convert(ht.format,ht.colorSpace),X=r.convert(ht.type),K=x(ht.internalFormat,ft,X,ht.normalized,ht.colorSpace);if(I(y))o.renderbufferStorageMultisampleEXT(t.RENDERBUFFER,Yt(y),K,y.width,y.height);else if(N)t.renderbufferStorageMultisample(t.RENDERBUFFER,Yt(y),K,y.width,y.height);else t.renderbufferStorage(t.RENDERBUFFER,K,y.width,y.height)}}t.bindRenderbuffer(t.RENDERBUFFER,null)}function tt(A,y,N){let H=y.isWebGLCubeRenderTarget===!0;if(n.bindFramebuffer(t.FRAMEBUFFER,A),!(y.depthTexture&&y.depthTexture.isDepthTexture))throw Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let et=i.get(y.depthTexture);if(et.__renderTarget=y,!et.__webglTexture||y.depthTexture.image.width!==y.width||y.depthTexture.image.height!==y.height)y.depthTexture.image.width=y.width,y.depthTexture.image.height=y.height,y.depthTexture.needsUpdate=!0;if(H){if(et.__webglInit===void 0)et.__webglInit=!0,y.depthTexture.addEventListener("dispose",w);if(et.__webglTexture===void 0){et.__webglTexture=t.createTexture(),n.bindTexture(t.TEXTURE_CUBE_MAP,et.__webglTexture),$t(t.TEXTURE_CUBE_MAP,y.depthTexture);let bt=r.convert(y.depthTexture.format),Ut=r.convert(y.depthTexture.type),gt;if(y.depthTexture.format===Ri)gt=t.DEPTH_COMPONENT24;else if(y.depthTexture.format===Ii)gt=t.DEPTH24_STENCIL8;for(let ut=0;ut<6;ut++)t.texImage2D(t.TEXTURE_CUBE_MAP_POSITIVE_X+ut,0,gt,y.width,y.height,0,bt,Ut,null)}}else at(y.depthTexture,0);let ht=et.__webglTexture,ft=Yt(y),X=H?t.TEXTURE_CUBE_MAP_POSITIVE_X+N:t.TEXTURE_2D,K=y.depthTexture.format===Ii?t.DEPTH_STENCIL_ATTACHMENT:t.DEPTH_ATTACHMENT;if(y.depthTexture.format===Ri)if(I(y))o.framebufferTexture2DMultisampleEXT(t.FRAMEBUFFER,K,X,ht,0,ft);else t.framebufferTexture2D(t.FRAMEBUFFER,K,X,ht,0);else if(y.depthTexture.format===Ii)if(I(y))o.framebufferTexture2DMultisampleEXT(t.FRAMEBUFFER,K,X,ht,0,ft);else t.framebufferTexture2D(t.FRAMEBUFFER,K,X,ht,0);else throw Error("THREE.WebGLTextures: Unknown depthTexture format.")}function st(A){let y=i.get(A),N=A.isWebGLCubeRenderTarget===!0;if(y.__boundDepthTexture!==A.depthTexture){let H=A.depthTexture;if(y.__depthDisposeCallback)y.__depthDisposeCallback();if(H){let et=()=>{delete y.__boundDepthTexture,delete y.__depthDisposeCallback,H.removeEventListener("dispose",et)};H.addEventListener("dispose",et),y.__depthDisposeCallback=et}y.__boundDepthTexture=H}if(A.depthTexture&&!y.__autoAllocateDepthBuffer)if(N)for(let H=0;H<6;H++)tt(y.__webglFramebuffer[H],A,H);else{let H=A.texture.mipmaps;if(H&&H.length>0)tt(y.__webglFramebuffer[0],A,0);else tt(y.__webglFramebuffer,A,0)}else if(N){y.__webglDepthbuffer=[];for(let H=0;H<6;H++)if(n.bindFramebuffer(t.FRAMEBUFFER,y.__webglFramebuffer[H]),y.__webglDepthbuffer[H]===void 0)y.__webglDepthbuffer[H]=t.createRenderbuffer(),ue(y.__webglDepthbuffer[H],A,!1);else{let et=A.stencilBuffer?t.DEPTH_STENCIL_ATTACHMENT:t.DEPTH_ATTACHMENT,ht=y.__webglDepthbuffer[H];t.bindRenderbuffer(t.RENDERBUFFER,ht),t.framebufferRenderbuffer(t.FRAMEBUFFER,et,t.RENDERBUFFER,ht)}}else{let H=A.texture.mipmaps;if(H&&H.length>0)n.bindFramebuffer(t.FRAMEBUFFER,y.__webglFramebuffer[0]);else n.bindFramebuffer(t.FRAMEBUFFER,y.__webglFramebuffer);if(y.__webglDepthbuffer===void 0)y.__webglDepthbuffer=t.createRenderbuffer(),ue(y.__webglDepthbuffer,A,!1);else{let et=A.stencilBuffer?t.DEPTH_STENCIL_ATTACHMENT:t.DEPTH_ATTACHMENT,ht=y.__webglDepthbuffer;t.bindRenderbuffer(t.RENDERBUFFER,ht),t.framebufferRenderbuffer(t.FRAMEBUFFER,et,t.RENDERBUFFER,ht)}}n.bindFramebuffer(t.FRAMEBUFFER,null)}function ot(A,y,N){let H=i.get(A);if(y!==void 0)Ct(H.__webglFramebuffer,A,A.texture,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,0);if(N!==void 0)st(A)}function ct(A){let y=A.texture,N=i.get(A),H=i.get(y);A.addEventListener("dispose",v);let et=A.textures,ht=A.isWebGLCubeRenderTarget===!0,ft=et.length>1;if(!ft){if(H.__webglTexture===void 0)H.__webglTexture=t.createTexture();H.__version=y.version,a.memory.textures++}if(ht){N.__webglFramebuffer=[];for(let X=0;X<6;X++)if(y.mipmaps&&y.mipmaps.length>0){N.__webglFramebuffer[X]=[];for(let K=0;K<y.mipmaps.length;K++)N.__webglFramebuffer[X][K]=t.createFramebuffer()}else N.__webglFramebuffer[X]=t.createFramebuffer()}else{if(y.mipmaps&&y.mipmaps.length>0){N.__webglFramebuffer=[];for(let X=0;X<y.mipmaps.length;X++)N.__webglFramebuffer[X]=t.createFramebuffer()}else N.__webglFramebuffer=t.createFramebuffer();if(ft)for(let X=0,K=et.length;X<K;X++){let bt=i.get(et[X]);if(bt.__webglTexture===void 0)bt.__webglTexture=t.createTexture(),a.memory.textures++}if(A.samples>0&&I(A)===!1){N.__webglMultisampledFramebuffer=t.createFramebuffer(),N.__webglColorRenderbuffer=[],n.bindFramebuffer(t.FRAMEBUFFER,N.__webglMultisampledFramebuffer);for(let X=0;X<et.length;X++){let K=et[X];N.__webglColorRenderbuffer[X]=t.createRenderbuffer(),t.bindRenderbuffer(t.RENDERBUFFER,N.__webglColorRenderbuffer[X]);let bt=r.convert(K.format,K.colorSpace),Ut=r.convert(K.type),gt=x(K.internalFormat,bt,Ut,K.normalized,K.colorSpace,A.isXRRenderTarget===!0),ut=Yt(A);t.renderbufferStorageMultisample(t.RENDERBUFFER,ut,gt,A.width,A.height),t.framebufferRenderbuffer(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0+X,t.RENDERBUFFER,N.__webglColorRenderbuffer[X])}if(t.bindRenderbuffer(t.RENDERBUFFER,null),A.depthBuffer)N.__webglDepthRenderbuffer=t.createRenderbuffer(),ue(N.__webglDepthRenderbuffer,A,!0);n.bindFramebuffer(t.FRAMEBUFFER,null)}}if(ht){n.bindTexture(t.TEXTURE_CUBE_MAP,H.__webglTexture),$t(t.TEXTURE_CUBE_MAP,y);for(let X=0;X<6;X++)if(y.mipmaps&&y.mipmaps.length>0)for(let K=0;K<y.mipmaps.length;K++)Ct(N.__webglFramebuffer[X][K],A,y,t.COLOR_ATTACHMENT0,t.TEXTURE_CUBE_MAP_POSITIVE_X+X,K);else Ct(N.__webglFramebuffer[X],A,y,t.COLOR_ATTACHMENT0,t.TEXTURE_CUBE_MAP_POSITIVE_X+X,0);if(p(y))S(t.TEXTURE_CUBE_MAP);n.unbindTexture()}else if(ft){for(let X=0,K=et.length;X<K;X++){let bt=et[X],Ut=i.get(bt),gt=t.TEXTURE_2D;if(A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)gt=A.isWebGL3DRenderTarget?t.TEXTURE_3D:t.TEXTURE_2D_ARRAY;if(n.bindTexture(gt,Ut.__webglTexture),$t(gt,bt),Ct(N.__webglFramebuffer,A,bt,t.COLOR_ATTACHMENT0+X,gt,0),p(bt))S(gt)}n.unbindTexture()}else{let X=t.TEXTURE_2D;if(A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)X=A.isWebGL3DRenderTarget?t.TEXTURE_3D:t.TEXTURE_2D_ARRAY;if(n.bindTexture(X,H.__webglTexture),$t(X,y),y.mipmaps&&y.mipmaps.length>0)for(let K=0;K<y.mipmaps.length;K++)Ct(N.__webglFramebuffer[K],A,y,t.COLOR_ATTACHMENT0,X,K);else Ct(N.__webglFramebuffer,A,y,t.COLOR_ATTACHMENT0,X,0);if(p(y))S(X);n.unbindTexture()}if(A.depthBuffer)st(A)}function St(A){let y=A.textures;for(let N=0,H=y.length;N<H;N++){let et=y[N];if(p(et)){let ht=E(A),ft=i.get(et).__webglTexture;n.bindTexture(ht,ft),S(ht),n.unbindTexture()}}}let Nt=[],Bt=[];function qt(A){if(A.samples>0){if(I(A)===!1){let{textures:y,width:N,height:H}=A,et=t.COLOR_BUFFER_BIT,ht=A.stencilBuffer?t.DEPTH_STENCIL_ATTACHMENT:t.DEPTH_ATTACHMENT,ft=i.get(A),X=y.length>1;if(X)for(let bt=0;bt<y.length;bt++)n.bindFramebuffer(t.FRAMEBUFFER,ft.__webglMultisampledFramebuffer),t.framebufferRenderbuffer(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0+bt,t.RENDERBUFFER,null),n.bindFramebuffer(t.FRAMEBUFFER,ft.__webglFramebuffer),t.framebufferTexture2D(t.DRAW_FRAMEBUFFER,t.COLOR_ATTACHMENT0+bt,t.TEXTURE_2D,null,0);n.bindFramebuffer(t.READ_FRAMEBUFFER,ft.__webglMultisampledFramebuffer);let K=A.texture.mipmaps;if(K&&K.length>0)n.bindFramebuffer(t.DRAW_FRAMEBUFFER,ft.__webglFramebuffer[0]);else n.bindFramebuffer(t.DRAW_FRAMEBUFFER,ft.__webglFramebuffer);for(let bt=0;bt<y.length;bt++){if(A.resolveDepthBuffer){if(A.depthBuffer)et|=t.DEPTH_BUFFER_BIT;if(A.stencilBuffer&&A.resolveStencilBuffer)et|=t.STENCIL_BUFFER_BIT}if(X){t.framebufferRenderbuffer(t.READ_FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.RENDERBUFFER,ft.__webglColorRenderbuffer[bt]);let Ut=i.get(y[bt]).__webglTexture;t.framebufferTexture2D(t.DRAW_FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,Ut,0)}if(t.blitFramebuffer(0,0,N,H,0,0,N,H,et,t.NEAREST),l===!0){if(Nt.length=0,Bt.length=0,Nt.push(t.COLOR_ATTACHMENT0+bt),A.depthBuffer&&A.storeMultisampledDepthBuffer===!1)Nt.push(ht),Bt.push(ht),t.invalidateFramebuffer(t.DRAW_FRAMEBUFFER,Bt);t.invalidateFramebuffer(t.READ_FRAMEBUFFER,Nt)}}if(n.bindFramebuffer(t.READ_FRAMEBUFFER,null),n.bindFramebuffer(t.DRAW_FRAMEBUFFER,null),X)for(let bt=0;bt<y.length;bt++){n.bindFramebuffer(t.FRAMEBUFFER,ft.__webglMultisampledFramebuffer),t.framebufferRenderbuffer(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0+bt,t.RENDERBUFFER,ft.__webglColorRenderbuffer[bt]);let Ut=i.get(y[bt]).__webglTexture;n.bindFramebuffer(t.FRAMEBUFFER,ft.__webglFramebuffer),t.framebufferTexture2D(t.DRAW_FRAMEBUFFER,t.COLOR_ATTACHMENT0+bt,t.TEXTURE_2D,Ut,0)}n.bindFramebuffer(t.DRAW_FRAMEBUFFER,ft.__webglMultisampledFramebuffer)}else if(A.depthBuffer&&A.storeMultisampledDepthBuffer===!1&&l){let y=A.stencilBuffer?t.DEPTH_STENCIL_ATTACHMENT:t.DEPTH_ATTACHMENT;t.invalidateFramebuffer(t.DRAW_FRAMEBUFFER,[y])}}}function Yt(A){return Math.min(s.maxSamples,A.samples)}function I(A){let y=i.get(A);return A.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&y.__useRenderToTexture!==!1}function fe(A){let y=a.render.frame;if(h.get(A)!==y)h.set(A,y),A.update()}function jt(A,y){let{colorSpace:N,format:H,type:et}=A;if(A.isCompressedTexture===!0||A.isVideoTexture===!0)return y;if(N!==nc&&N!==Li)if(ne.getTransfer(N)===ge){if(H!==Rn||et!==_n)dt("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.")}else Lt("WebGLTextures: Unsupported texture color space:",N);return y}function te(A){if(typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement)c.width=A.naturalWidth||A.width,c.height=A.naturalHeight||A.height;else if(typeof VideoFrame<"u"&&A instanceof VideoFrame)c.width=A.displayWidth,c.height=A.displayHeight;else c.width=A.width,c.height=A.height;return c}this.allocateTextureUnit=J,this.resetTextureUnits=Z,this.getTextureUnits=P,this.setTextureUnits=G,this.setTexture2D=at,this.setTexture2DArray=W,this.setTexture3D=Q,this.setTextureCube=it,this.rebindTextures=ot,this.setupRenderTarget=ct,this.updateRenderTargetMipmap=St,this.updateMultisampleRenderTarget=qt,this.setupDepthRenderbuffer=st,this.setupFrameBufferTexture=Ct,this.useMultisampledRTT=I,this.isReversedDepthBuffer=function(){return n.buffers.depth.getReversed()}}function XS(t,e){function n(i,s=Li){let r,a=ne.getTransfer(s);if(i===_n)return t.UNSIGNED_BYTE;if(i===yl)return t.UNSIGNED_SHORT_4_4_4_4;if(i===Sl)return t.UNSIGNED_SHORT_5_5_5_1;if(i===bd)return t.UNSIGNED_INT_5_9_9_9_REV;if(i===Td)return t.UNSIGNED_INT_10F_11F_11F_REV;if(i===Sd)return t.BYTE;if(i===Md)return t.SHORT;if(i===tr)return t.UNSIGNED_SHORT;if(i===vl)return t.INT;if(i===ri)return t.UNSIGNED_INT;if(i===Vn)return t.FLOAT;if(i===je)return t.HALF_FLOAT;if(i===Ed)return t.ALPHA;if(i===Ad)return t.RGB;if(i===Rn)return t.RGBA;if(i===Ri)return t.DEPTH_COMPONENT;if(i===Ii)return t.DEPTH_STENCIL;if(i===wd)return t.RED;if(i===Ml)return t.RED_INTEGER;if(i===Pi)return t.RG;if(i===bl)return t.RG_INTEGER;if(i===Tl)return t.RGBA_INTEGER;if(i===va||i===ya||i===Sa||i===Ma)if(a===ge)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(i===va)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===ya)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===Sa)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===Ma)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(i===va)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===ya)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===Sa)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===Ma)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===El||i===Al||i===wl||i===Cl)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(i===El)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===Al)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===wl)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===Cl)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===Rl||i===Il||i===Pl||i===Ll||i===Nl||i===ba||i===Ul)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(i===Rl||i===Il)return a===ge?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(i===Pl)return a===ge?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(i===Ll)return r.COMPRESSED_R11_EAC;if(i===Nl)return r.COMPRESSED_SIGNED_R11_EAC;if(i===ba)return r.COMPRESSED_RG11_EAC;if(i===Ul)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(i===Dl||i===Fl||i===Ol||i===Bl||i===zl||i===Gl||i===kl||i===Hl||i===Vl||i===Wl||i===Xl||i===ql||i===Yl||i===Zl)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(i===Dl)return a===ge?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===Fl)return a===ge?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===Ol)return a===ge?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===Bl)return a===ge?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===zl)return a===ge?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===Gl)return a===ge?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===kl)return a===ge?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===Hl)return a===ge?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===Vl)return a===ge?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===Wl)return a===ge?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===Xl)return a===ge?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===ql)return a===ge?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===Yl)return a===ge?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===Zl)return a===ge?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===Jl||i===$l||i===Kl)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(i===Jl)return a===ge?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===$l)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===Kl)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===Ql||i===jl||i===Ta||i===tc)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(i===Ql)return r.COMPRESSED_RED_RGTC1_EXT;if(i===jl)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===Ta)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===tc)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;if(i===xs)return t.UNSIGNED_INT_24_8;return t[i]!==void 0?t[i]:null}return{convert:n}}var qS=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,YS=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class Vp{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e){if(this.texture===null){let n=new Oa(t.texture);if(t.depthNear!==e.depthNear||t.depthFar!==e.depthFar)this.depthNear=t.depthNear,this.depthFar=t.depthFar;this.texture=n}}getMesh(t){if(this.texture!==null){if(this.mesh===null){let e=t.cameras[0].viewport,n=new De({vertexShader:qS,fragmentShader:YS,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new Me(new Ms(20,20),n)}}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class Wp extends ln{constructor(t,e){super();let n=this,i=null,s=1,r=null,a="local-floor",o=1,l=null,c=null,h=null,d=null,u=null,f=null,m=typeof XRWebGLBinding<"u",_=new Vp,g={},p=e.getContextAttributes(),S=null,E=null,x=[],T=[],C=new j,w=null,v=null,b=new Le;b.viewport=new de;let O=new Le;O.viewport=new de;let L=[b,O],F=new Jc,Z=null,P=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(q){let lt=x[q];if(lt===void 0)lt=new sr,x[q]=lt;return lt.getTargetRaySpace()},this.getControllerGrip=function(q){let lt=x[q];if(lt===void 0)lt=new sr,x[q]=lt;return lt.getGripSpace()},this.getHand=function(q){let lt=x[q];if(lt===void 0)lt=new sr,x[q]=lt;return lt.getHandSpace()};function G(q){let lt=T.indexOf(q.inputSource);if(lt===-1)return;let rt=x[lt];if(rt!==void 0)rt.update(q.inputSource,q.frame,l||r),rt.dispatchEvent({type:q.type,data:q.inputSource})}function J(){i.removeEventListener("select",G),i.removeEventListener("selectstart",G),i.removeEventListener("selectend",G),i.removeEventListener("squeeze",G),i.removeEventListener("squeezestart",G),i.removeEventListener("squeezeend",G),i.removeEventListener("end",J),i.removeEventListener("inputsourceschange",k);for(let q=0;q<x.length;q++){let lt=T[q];if(lt===null)continue;T[q]=null,x[q].disconnect(lt)}Z=null,P=null,_.reset();for(let q in g)delete g[q];if(t.setRenderTarget(S),u=null,d=null,h=null,i=null,E=null,$t.stop(),n.isPresenting=!1,t.setPixelRatio(w),t.setSize(C.width,C.height,!1),v!==null){let q=v.camera;q.fov=v.fov,q.zoom=v.zoom,q.updateProjectionMatrix(),v=null}n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(q){if(s=q,n.isPresenting===!0)dt("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(q){if(a=q,n.isPresenting===!0)dt("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||r},this.setReferenceSpace=function(q){l=q},this.getBaseLayer=function(){return d!==null?d:u},this.getBinding=function(){if(h===null&&m)h=new XRWebGLBinding(i,e);return h},this.getFrame=function(){return f},this.getSession=function(){return i},this.setSession=async function(q){if(i=q,i!==null){if(S=t.getRenderTarget(),i.addEventListener("select",G),i.addEventListener("selectstart",G),i.addEventListener("selectend",G),i.addEventListener("squeeze",G),i.addEventListener("squeezestart",G),i.addEventListener("squeezeend",G),i.addEventListener("end",J),i.addEventListener("inputsourceschange",k),p.xrCompatible!==!0)await e.makeXRCompatible();if(w=t.getPixelRatio(),t.getSize(C),!(m&&("createProjectionLayer"in XRWebGLBinding.prototype))){let rt={antialias:p.antialias,alpha:!0,depth:p.depth,stencil:p.stencil,framebufferScaleFactor:s};u=new XRWebGLLayer(i,e,rt),i.updateRenderState({baseLayer:u}),t.setPixelRatio(1),t.setSize(u.framebufferWidth,u.framebufferHeight,!1),E=new Ce(u.framebufferWidth,u.framebufferHeight,{format:Rn,type:_n,colorSpace:t.outputColorSpace,stencilBuffer:p.stencil,resolveDepthBuffer:u.ignoreDepthValues===!1,resolveStencilBuffer:u.ignoreDepthValues===!1,storeMultisampledDepthBuffer:u.ignoreDepthValues===!1,storeMultisampledStencilBuffer:u.ignoreDepthValues===!1})}else{let rt=null,Ot=null,Gt=null;if(p.depth)Gt=p.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,rt=p.stencil?Ii:Ri,Ot=p.stencil?xs:ri;let Ct={colorFormat:e.RGBA8,depthFormat:Gt,scaleFactor:s};h=this.getBinding(),d=h.createProjectionLayer(Ct),i.updateRenderState({layers:[d]}),t.setPixelRatio(1),t.setSize(d.textureWidth,d.textureHeight,!1),E=new Ce(d.textureWidth,d.textureHeight,{format:Rn,type:_n,depthTexture:new Ui(d.textureWidth,d.textureHeight,Ot,void 0,void 0,void 0,void 0,void 0,void 0,rt),stencilBuffer:p.stencil,colorSpace:t.outputColorSpace,samples:p.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1,storeMultisampledDepthBuffer:d.ignoreDepthValues===!1,storeMultisampledStencilBuffer:d.ignoreDepthValues===!1})}E.isXRRenderTarget=!0,this.setFoveation(o),l=null,r=await i.requestReferenceSpace(a),$t.setContext(i),$t.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(i!==null)return i.environmentBlendMode},this.getDepthTexture=function(){return _.getDepthTexture()};function k(q){for(let lt=0;lt<q.removed.length;lt++){let rt=q.removed[lt],Ot=T.indexOf(rt);if(Ot>=0)T[Ot]=null,x[Ot].disconnect(rt)}for(let lt=0;lt<q.added.length;lt++){let rt=q.added[lt],Ot=T.indexOf(rt);if(Ot===-1){for(let Ct=0;Ct<x.length;Ct++)if(Ct>=T.length){T.push(rt),Ot=Ct;break}else if(T[Ct]===null){T[Ct]=rt,Ot=Ct;break}if(Ot===-1)break}let Gt=x[Ot];if(Gt)Gt.connect(rt)}}let at=new R,W=new R;function Q(q,lt,rt){at.setFromMatrixPosition(lt.matrixWorld),W.setFromMatrixPosition(rt.matrixWorld);let Ot=at.distanceTo(W),Gt=lt.projectionMatrix.elements,Ct=rt.projectionMatrix.elements,ue=Gt[14]/(Gt[10]-1),tt=Gt[14]/(Gt[10]+1),st=(Gt[9]+1)/Gt[5],ot=(Gt[9]-1)/Gt[5],ct=(Gt[8]-1)/Gt[0],St=(Ct[8]+1)/Ct[0],Nt=ue*ct,Bt=ue*St,qt=Ot/(-ct+St),Yt=qt*-ct;if(lt.matrixWorld.decompose(q.position,q.quaternion,q.scale),q.translateX(Yt),q.translateZ(qt),q.matrixWorld.compose(q.position,q.quaternion,q.scale),q.matrixWorldInverse.copy(q.matrixWorld).invert(),Gt[10]===-1)q.projectionMatrix.copy(lt.projectionMatrix),q.projectionMatrixInverse.copy(lt.projectionMatrixInverse);else{let I=ue+qt,fe=tt+qt,jt=Nt-Yt,te=Bt+(Ot-Yt),A=st*tt/fe*I,y=ot*tt/fe*I;q.projectionMatrix.makePerspective(jt,te,A,y,I,fe),q.projectionMatrixInverse.copy(q.projectionMatrix).invert()}}function it(q,lt){if(lt===null)q.matrixWorld.copy(q.matrix);else q.matrixWorld.multiplyMatrices(lt.matrixWorld,q.matrix);q.matrixWorldInverse.copy(q.matrixWorld).invert()}this.updateCamera=function(q){if(i===null)return;let{near:lt,far:rt}=q;if(_.texture!==null){if(_.depthNear>0)lt=_.depthNear;if(_.depthFar>0)rt=_.depthFar}if(F.near=O.near=b.near=lt,F.far=O.far=b.far=rt,Z!==F.near||P!==F.far)i.updateRenderState({depthNear:F.near,depthFar:F.far}),Z=F.near,P=F.far;F.layers.mask=q.layers.mask|6,b.layers.mask=F.layers.mask&-5,O.layers.mask=F.layers.mask&-3;let Ot=q.parent,Gt=F.cameras;it(F,Ot);for(let Ct=0;Ct<Gt.length;Ct++)it(Gt[Ct],Ot);if(Gt.length===2)Q(F,b,O);else F.projectionMatrix.copy(b.projectionMatrix);if(v===null&&q.isPerspectiveCamera)v={camera:q,fov:q.fov,zoom:q.zoom};Dt(q,F,Ot)};function Dt(q,lt,rt){if(rt===null)q.matrix.copy(lt.matrixWorld);else q.matrix.copy(rt.matrixWorld),q.matrix.invert(),q.matrix.multiply(lt.matrixWorld);if(q.matrix.decompose(q.position,q.quaternion,q.scale),q.updateMatrixWorld(!0),q.projectionMatrix.copy(lt.projectionMatrix),q.projectionMatrixInverse.copy(lt.projectionMatrixInverse),q.isPerspectiveCamera)q.fov=Ei*2*Math.atan(1/q.projectionMatrix.elements[5]),q.zoom=1}this.getCamera=function(){return F},this.getFoveation=function(){if(d===null&&u===null)return;return o},this.setFoveation=function(q){if(o=q,d!==null)d.fixedFoveation=q;if(u!==null&&u.fixedFoveation!==void 0)u.fixedFoveation=q},this.hasDepthSensing=function(){return _.texture!==null},this.getDepthSensingMesh=function(){return _.getMesh(F)},this.getCameraTexture=function(q){return g[q]};let Ft=null;function he(q,lt){if(c=lt.getViewerPose(l||r),f=lt,c!==null){let rt=c.views;if(u!==null)t.setRenderTargetFramebuffer(E,u.framebuffer),t.setRenderTarget(E);let Ot=!1;if(rt.length!==F.cameras.length)F.cameras.length=0,Ot=!0;for(let tt=0;tt<rt.length;tt++){let st=rt[tt],ot=null;if(u!==null)ot=u.getViewport(st);else{let St=h.getViewSubImage(d,st);if(ot=St.viewport,tt===0)t.setRenderTargetTextures(E,St.colorTexture,St.depthStencilTexture),t.setRenderTarget(E)}let ct=L[tt];if(ct===void 0)ct=new Le,ct.layers.enable(tt),ct.viewport=new de,L[tt]=ct;if(ct.matrix.fromArray(st.transform.matrix),ct.matrix.decompose(ct.position,ct.quaternion,ct.scale),ct.projectionMatrix.fromArray(st.projectionMatrix),ct.projectionMatrixInverse.copy(ct.projectionMatrix).invert(),ct.viewport.set(ot.x,ot.y,ot.width,ot.height),tt===0)F.matrix.copy(ct.matrix),F.matrix.decompose(F.position,F.quaternion,F.scale);if(Ot===!0)F.cameras.push(ct)}let Gt=i.enabledFeatures;if(Gt&&Gt.includes("depth-sensing")&&i.depthUsage=="gpu-optimized"&&m){h=n.getBinding();let tt=h.getDepthInformation(rt[0]);if(tt&&tt.isValid&&tt.texture)_.init(tt,i.renderState)}if(Gt&&Gt.includes("camera-access")&&m){t.state.unbindTexture(),h=n.getBinding();for(let tt=0;tt<rt.length;tt++){let st=rt[tt].camera;if(st){let ot=g[st];if(!ot)ot=new Oa,g[st]=ot;let ct=h.getCameraImage(st);ot.sourceTexture=ct}}}}for(let rt=0;rt<x.length;rt++){let Ot=T[rt],Gt=x[rt];if(Ot!==null&&Gt!==void 0)Gt.update(Ot,lt,l||r)}if(Ft)Ft(q,lt);if(lt.detectedPlanes)n.dispatchEvent({type:"planesdetected",data:lt});f=null}let $t=new Lp;$t.setAnimationLoop(he),this.setAnimationLoop=function(q){Ft=q},this.dispose=function(){}}}var ZS=new Vt,Xp=new Xt;Xp.set(-1,0,0,0,1,0,0,0,1);function JS(t,e){function n(g,p){if(g.matrixAutoUpdate===!0)g.updateMatrix();p.value.copy(g.matrix)}function i(g,p){if(p.color.getRGB(g.fogColor.value,wc(t)),p.isFog)g.fogNear.value=p.near,g.fogFar.value=p.far;else if(p.isFogExp2)g.fogDensity.value=p.density}function s(g,p,S,E,x){if(p.isNodeMaterial)p.uniformsNeedUpdate=!1;else if(p.isMeshBasicMaterial)r(g,p);else if(p.isMeshLambertMaterial){if(r(g,p),p.envMap)g.envMapIntensity.value=p.envMapIntensity}else if(p.isMeshToonMaterial)r(g,p),d(g,p);else if(p.isMeshPhongMaterial){if(r(g,p),h(g,p),p.envMap)g.envMapIntensity.value=p.envMapIntensity}else if(p.isMeshStandardMaterial){if(r(g,p),u(g,p),p.isMeshPhysicalMaterial)f(g,p,x)}else if(p.isMeshMatcapMaterial)r(g,p),m(g,p);else if(p.isMeshDepthMaterial)r(g,p);else if(p.isMeshDistanceMaterial)r(g,p),_(g,p);else if(p.isMeshNormalMaterial)r(g,p);else if(p.isLineBasicMaterial){if(a(g,p),p.isLineDashedMaterial)o(g,p)}else if(p.isPointsMaterial)l(g,p,S,E);else if(p.isSpriteMaterial)c(g,p);else if(p.isShadowMaterial)g.color.value.copy(p.color),g.opacity.value=p.opacity;else if(p.isShaderMaterial)p.uniformsNeedUpdate=!1}function r(g,p){if(g.opacity.value=p.opacity,p.color)g.diffuse.value.copy(p.color);if(p.emissive)g.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity);if(p.map)g.map.value=p.map,n(p.map,g.mapTransform);if(p.alphaMap)g.alphaMap.value=p.alphaMap,n(p.alphaMap,g.alphaMapTransform);if(p.bumpMap){if(g.bumpMap.value=p.bumpMap,n(p.bumpMap,g.bumpMapTransform),g.bumpScale.value=p.bumpScale,p.side===Ke)g.bumpScale.value*=-1}if(p.normalMap){if(g.normalMap.value=p.normalMap,n(p.normalMap,g.normalMapTransform),g.normalScale.value.copy(p.normalScale),p.side===Ke)g.normalScale.value.negate()}if(p.displacementMap)g.displacementMap.value=p.displacementMap,n(p.displacementMap,g.displacementMapTransform),g.displacementScale.value=p.displacementScale,g.displacementBias.value=p.displacementBias;if(p.emissiveMap)g.emissiveMap.value=p.emissiveMap,n(p.emissiveMap,g.emissiveMapTransform);if(p.specularMap)g.specularMap.value=p.specularMap,n(p.specularMap,g.specularMapTransform);if(p.alphaTest>0)g.alphaTest.value=p.alphaTest;let S=e.get(p),{envMap:E,envMapRotation:x}=S;if(E){if(g.envMap.value=E,g.envMapRotation.value.setFromMatrix4(ZS.makeRotationFromEuler(x)).transpose(),E.isCubeTexture&&E.isRenderTargetTexture===!1)g.envMapRotation.value.premultiply(Xp);g.reflectivity.value=p.reflectivity,g.ior.value=p.ior,g.refractionRatio.value=p.refractionRatio}if(p.lightMap)g.lightMap.value=p.lightMap,g.lightMapIntensity.value=p.lightMapIntensity,n(p.lightMap,g.lightMapTransform);if(p.aoMap)g.aoMap.value=p.aoMap,g.aoMapIntensity.value=p.aoMapIntensity,n(p.aoMap,g.aoMapTransform)}function a(g,p){if(g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,p.map)g.map.value=p.map,n(p.map,g.mapTransform)}function o(g,p){g.dashSize.value=p.dashSize,g.totalSize.value=p.dashSize+p.gapSize,g.scale.value=p.scale}function l(g,p,S,E){if(g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.size.value=p.size*S,g.scale.value=E*0.5,p.map)g.map.value=p.map,n(p.map,g.uvTransform);if(p.alphaMap)g.alphaMap.value=p.alphaMap,n(p.alphaMap,g.alphaMapTransform);if(p.alphaTest>0)g.alphaTest.value=p.alphaTest}function c(g,p){if(g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.rotation.value=p.rotation,p.map)g.map.value=p.map,n(p.map,g.mapTransform);if(p.alphaMap)g.alphaMap.value=p.alphaMap,n(p.alphaMap,g.alphaMapTransform);if(p.alphaTest>0)g.alphaTest.value=p.alphaTest}function h(g,p){g.specular.value.copy(p.specular),g.shininess.value=Math.max(p.shininess,0.0001)}function d(g,p){if(p.gradientMap)g.gradientMap.value=p.gradientMap}function u(g,p){if(g.metalness.value=p.metalness,p.metalnessMap)g.metalnessMap.value=p.metalnessMap,n(p.metalnessMap,g.metalnessMapTransform);if(g.roughness.value=p.roughness,p.roughnessMap)g.roughnessMap.value=p.roughnessMap,n(p.roughnessMap,g.roughnessMapTransform);if(p.envMap)g.envMapIntensity.value=p.envMapIntensity}function f(g,p,S){if(g.ior.value=p.ior,p.sheen>0){if(g.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),g.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap)g.sheenColorMap.value=p.sheenColorMap,n(p.sheenColorMap,g.sheenColorMapTransform);if(p.sheenRoughnessMap)g.sheenRoughnessMap.value=p.sheenRoughnessMap,n(p.sheenRoughnessMap,g.sheenRoughnessMapTransform)}if(p.clearcoat>0){if(g.clearcoat.value=p.clearcoat,g.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap)g.clearcoatMap.value=p.clearcoatMap,n(p.clearcoatMap,g.clearcoatMapTransform);if(p.clearcoatRoughnessMap)g.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,n(p.clearcoatRoughnessMap,g.clearcoatRoughnessMapTransform);if(p.clearcoatNormalMap){if(g.clearcoatNormalMap.value=p.clearcoatNormalMap,n(p.clearcoatNormalMap,g.clearcoatNormalMapTransform),g.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===Ke)g.clearcoatNormalScale.value.negate()}}if(p.dispersion>0)g.dispersion.value=p.dispersion;if(p.retroreflectivity>0)g.retroreflectivity.value=p.retroreflectivity;if(p.iridescence>0){if(g.iridescence.value=p.iridescence,g.iridescenceIOR.value=p.iridescenceIOR,g.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],g.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap)g.iridescenceMap.value=p.iridescenceMap,n(p.iridescenceMap,g.iridescenceMapTransform);if(p.iridescenceThicknessMap)g.iridescenceThicknessMap.value=p.iridescenceThicknessMap,n(p.iridescenceThicknessMap,g.iridescenceThicknessMapTransform)}if(p.transmission>0){if(g.transmission.value=p.transmission,g.transmissionSamplerMap.value=S.texture,g.transmissionSamplerSize.value.set(S.width,S.height),p.transmissionMap)g.transmissionMap.value=p.transmissionMap,n(p.transmissionMap,g.transmissionMapTransform);if(g.thickness.value=p.thickness,p.thicknessMap)g.thicknessMap.value=p.thicknessMap,n(p.thicknessMap,g.thicknessMapTransform);g.attenuationDistance.value=p.attenuationDistance,g.attenuationColor.value.copy(p.attenuationColor)}if(p.anisotropy>0){if(g.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap)g.anisotropyMap.value=p.anisotropyMap,n(p.anisotropyMap,g.anisotropyMapTransform)}if(g.specularIntensity.value=p.specularIntensity,g.specularColor.value.copy(p.specularColor),p.specularColorMap)g.specularColorMap.value=p.specularColorMap,n(p.specularColorMap,g.specularColorMapTransform);if(p.specularIntensityMap)g.specularIntensityMap.value=p.specularIntensityMap,n(p.specularIntensityMap,g.specularIntensityMapTransform)}function m(g,p){if(p.matcap)g.matcap.value=p.matcap}function _(g,p){let S=e.get(p).light;g.referencePosition.value.setFromMatrixPosition(S.matrixWorld),g.nearDistance.value=S.shadow.camera.near,g.farDistance.value=S.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:s}}function $S(t,e,n,i){let s={},r={},a=[],o=t.getParameter(t.MAX_UNIFORM_BUFFER_BINDINGS);function l(x,T){let C=T.program;i.uniformBlockBinding(x,C)}function c(x,T){let C=s[x.id];if(C===void 0)g(x),C=h(x),s[x.id]=C,x.addEventListener("dispose",S);let w=T.program;i.updateUBOMapping(x,w);let v=e.render.frame;if(r[x.id]!==v)u(x),r[x.id]=v}function h(x){let T=d();x.__bindingPointIndex=T;let C=t.createBuffer(),{__size:w,usage:v}=x;return t.bindBuffer(t.UNIFORM_BUFFER,C),t.bufferData(t.UNIFORM_BUFFER,w,v),t.bindBuffer(t.UNIFORM_BUFFER,null),t.bindBufferBase(t.UNIFORM_BUFFER,T,C),C}function d(){for(let x=0;x<o;x++)if(a.indexOf(x)===-1)return a.push(x),x;return Lt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(x){let T=s[x.id],{uniforms:C,__cache:w}=x;t.bindBuffer(t.UNIFORM_BUFFER,T);for(let v=0,b=C.length;v<b;v++){let O=C[v];if(Array.isArray(O))for(let L=0,F=O.length;L<F;L++)f(O[L],v,L,w);else f(O,v,0,w)}t.bindBuffer(t.UNIFORM_BUFFER,null)}function f(x,T,C,w){if(_(x,T,C,w)===!0){let{__offset:v,value:b}=x;if(Array.isArray(b)){let O=0;for(let L=0;L<b.length;L++){let F=b[L],Z=p(F);if(m(F,x.__data,O),typeof F!=="number"&&typeof F!=="boolean"&&!F.isMatrix3&&!ArrayBuffer.isView(F))O+=Z.storage/Float32Array.BYTES_PER_ELEMENT}}else m(b,x.__data,0);t.bufferSubData(t.UNIFORM_BUFFER,v,x.__data)}}function m(x,T,C){if(typeof x==="number"||typeof x==="boolean")T[0]=x;else if(x.isMatrix3)T[0]=x.elements[0],T[1]=x.elements[1],T[2]=x.elements[2],T[3]=0,T[4]=x.elements[3],T[5]=x.elements[4],T[6]=x.elements[5],T[7]=0,T[8]=x.elements[6],T[9]=x.elements[7],T[10]=x.elements[8],T[11]=0;else if(ArrayBuffer.isView(x))T.set(new x.constructor(x.buffer,x.byteOffset,T.length));else x.toArray(T,C)}function _(x,T,C,w){let v=x.value,b=T+"_"+C;if(w[b]===void 0){if(typeof v==="number"||typeof v==="boolean")w[b]=v;else if(ArrayBuffer.isView(v))w[b]=v.slice();else w[b]=v.clone();return!0}else{let O=w[b];if(typeof v==="number"||typeof v==="boolean"){if(O!==v)return w[b]=v,!0}else if(ArrayBuffer.isView(v))return!0;else if(O.equals(v)===!1)return O.copy(v),!0}return!1}function g(x){let T=x.uniforms,C=0,w=16;for(let b=0,O=T.length;b<O;b++){let L=Array.isArray(T[b])?T[b]:[T[b]];for(let F=0,Z=L.length;F<Z;F++){let P=L[F],G=Array.isArray(P.value)?P.value:[P.value];for(let J=0,k=G.length;J<k;J++){let at=G[J],W=p(at),Q=C%w,it=Q%W.boundary,Dt=Q+it;if(C+=it,Dt!==0&&w-Dt<W.storage)C+=w-Dt;P.__data=new Float32Array(W.storage/Float32Array.BYTES_PER_ELEMENT),P.__offset=C,C+=W.storage}}}let v=C%w;if(v>0)C+=w-v;return x.__size=C,x.__cache={},this}function p(x){let T={boundary:0,storage:0};if(typeof x==="number"||typeof x==="boolean")T.boundary=4,T.storage=4;else if(x.isVector2)T.boundary=8,T.storage=8;else if(x.isVector3||x.isColor)T.boundary=16,T.storage=12;else if(x.isVector4)T.boundary=16,T.storage=16;else if(x.isMatrix3)T.boundary=48,T.storage=48;else if(x.isMatrix4)T.boundary=64,T.storage=64;else if(x.isTexture)dt("WebGLRenderer: Texture samplers can not be part of an uniforms group.");else if(ArrayBuffer.isView(x))T.boundary=16,T.storage=x.byteLength;else dt("WebGLRenderer: Unsupported uniform value type.",x);return T}function S(x){let T=x.target;T.removeEventListener("dispose",S);let C=a.indexOf(T.__bindingPointIndex);a.splice(C,1),t.deleteBuffer(s[T.id]),delete s[T.id],delete r[T.id]}function E(){for(let x in s)t.deleteBuffer(s[x]);a=[],s={},r={}}return{bind:l,update:c,dispose:E}}var KS=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),In=null;function QS(){if(In===null)In=new sn(KS,16,16,Pi,je),In.name="DFG_LUT",In.minFilter=Qe,In.magFilter=Qe,In.wrapS=_a,In.wrapT=_a,In.generateMipmaps=!1,In.needsUpdate=!0;return In}class jS{constructor(t={}){let{canvas:e=Gd(),context:n=null,depth:i=!0,stencil:s=!1,alpha:r=!1,antialias:a=!1,premultipliedAlpha:o=!0,preserveDrawingBuffer:l=!1,powerPreference:c="default",failIfMajorPerformanceCaveat:h=!1,reversedDepthBuffer:d=!1,outputBufferType:u=_n}=t;this.isWebGLRenderer=!0;let f;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");f=n.getContextAttributes().alpha}else f=r;let m=u,_=new Set([Tl,bl,Ml]),g=new Set([_n,ri,tr,xs,yl,Sl]),p=new Uint32Array(4),S=new Int32Array(4),E=new R,x=null,T=null,C=[],w=[],v=null;this.domElement=e,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=gn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let b=this,O=!1,L=null,F=null,Z=null,P=null;this._outputColorSpace=Ld;let G=0,J=0,k=null,at=-1,W=null,Q=new de,it=new de,Dt=null,Ft=new _t(0),he=0,{width:$t,height:q}=e,lt=1,rt=null,Ot=null,Gt=new de(0,0,$t,q),Ct=new de(0,0,$t,q),ue=!1,tt=new ii,st=!1,ot=!1,ct=new Vt,St=new R,Nt=new de,Bt={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},qt=!1;function Yt(){return k===null?lt:1}let I=n;function fe(M,U){return e.getContext(M,U)}let jt,te,A,y,N,H,et,ht,ft,X,K,bt,Ut,gt,ut,zt,kt,ae,D,pt,Y,mt,Et;try{let M={alpha:!0,depth:i,stencil:s,antialias:a,premultipliedAlpha:o,preserveDrawingBuffer:l,powerPreference:c,failIfMajorPerformanceCaveat:h};if("setAttribute"in e)e.setAttribute("data-engine",`three.js r${Bu}`);if(e.addEventListener("webglcontextlost",Zt,!1),e.addEventListener("webglcontextrestored",_e,!1),e.addEventListener("webglcontextcreationerror",oe,!1),I===null){if(I=fe("webgl2",M),I===null)if(fe("webgl2"))throw Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes.");else throw Error("THREE.WebGLRenderer: Error creating WebGL context.")}nt()}catch(M){throw e.removeEventListener("webglcontextlost",Zt,!1),e.removeEventListener("webglcontextrestored",_e,!1),e.removeEventListener("webglcontextcreationerror",oe,!1),Lt("WebGLRenderer: "+M.message),M}function nt(){if(jt=new ry(I),jt.init(),Y=new XS(I,jt),te=new Jv(I,jt,t,Y),A=new VS(I,jt),te.reversedDepthBuffer&&d)A.buffers.depth.setReversed(!0);F=I.createFramebuffer(),Z=I.createFramebuffer(),P=I.createFramebuffer(),y=new ly(I),N=new RS,H=new WS(I,jt,A,N,te,Y,y),et=new sy(b),ht=new h0(I),mt=new Yv(I,ht),ft=new ay(I,ht,y,mt),X=new hy(I,ft,ht,mt,y),ae=new cy(I,te,H),ut=new $v(N),K=new CS(b,et,jt,te,mt,ut),bt=new JS(b,N),Ut=new PS,gt=new OS(jt),kt=new qv(b,et,A,X,f,o),zt=new HS(b,X,te),Et=new $S(I,y,te,A),D=new Zv(I,jt,y),pt=new oy(I,jt,y),y.programs=K.programs,b.capabilities=te,b.extensions=jt,b.properties=N,b.renderLists=Ut,b.shadowMap=zt,b.state=A,b.info=y}if(m!==_n)v=new dy(m,e.width,e.height,a,i,s);let vt=new Wp(b,I);this.xr=vt,this.getContext=function(){return I},this.getContextAttributes=function(){return I.getContextAttributes()},this.forceContextLoss=function(){let M=jt.get("WEBGL_lose_context");if(M)M.loseContext()},this.forceContextRestore=function(){let M=jt.get("WEBGL_lose_context");if(M)M.restoreContext()},this.getPixelRatio=function(){return lt},this.setPixelRatio=function(M){if(M===void 0)return;lt=M,this.setSize($t,q,!1)},this.getSize=function(M){return M.set($t,q)},this.setSize=function(M,U,V=!0){if(vt.isPresenting){dt("WebGLRenderer: Can't change size while VR device is presenting.");return}if($t=M,q=U,e.width=Math.floor(M*lt),e.height=Math.floor(U*lt),V===!0)e.style.width=M+"px",e.style.height=U+"px";if(v!==null)v.setSize(e.width,e.height);this.setViewport(0,0,M,U)},this.getDrawingBufferSize=function(M){return M.set($t*lt,q*lt).floor()},this.setDrawingBufferSize=function(M,U,V){$t=M,q=U,lt=V,e.width=Math.floor(M*V),e.height=Math.floor(U*V),this.setViewport(0,0,M,U)},this.setEffects=function(M){if(m===_n){Lt("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(M){for(let U=0;U<M.length;U++)if(M[U].isOutputPass===!0){dt("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}v.setEffects(M||[])},this.getCurrentViewport=function(M){return M.copy(Q)},this.getViewport=function(M){return M.copy(Gt)},this.setViewport=function(M,U,V,B){if(M.isVector4)Gt.set(M.x,M.y,M.z,M.w);else Gt.set(M,U,V,B);A.viewport(Q.copy(Gt).multiplyScalar(lt).round())},this.getScissor=function(M){return M.copy(Ct)},this.setScissor=function(M,U,V,B){if(M.isVector4)Ct.set(M.x,M.y,M.z,M.w);else Ct.set(M,U,V,B);A.scissor(it.copy(Ct).multiplyScalar(lt).round())},this.getScissorTest=function(){return ue},this.setScissorTest=function(M){A.setScissorTest(ue=M)},this.setOpaqueSort=function(M){rt=M},this.setTransparentSort=function(M){Ot=M},this.getClearColor=function(M){return M.copy(kt.getClearColor())},this.setClearColor=function(){kt.setClearColor(...arguments)},this.getClearAlpha=function(){return kt.getClearAlpha()},this.setClearAlpha=function(){kt.setClearAlpha(...arguments)},this.clear=function(M=!0,U=!0,V=!0){let B=0;if(M){let z=!1;if(k!==null){let Mt=k.texture.format;z=_.has(Mt)}if(z){let Mt=k.texture.type,wt=g.has(Mt),yt=kt.getClearColor(),Rt=kt.getClearAlpha(),{r:Pt,g:Kt,b:ee}=yt;if(wt)p[0]=Pt,p[1]=Kt,p[2]=ee,p[3]=Rt,I.clearBufferuiv(I.COLOR,0,p);else S[0]=Pt,S[1]=Kt,S[2]=ee,S[3]=Rt,I.clearBufferiv(I.COLOR,0,S)}else B|=I.COLOR_BUFFER_BIT}if(U)B|=I.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0);if(V)B|=I.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295);if(B!==0)I.clear(B)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(M){M.setRenderer(this),L=M},this.dispose=function(){e.removeEventListener("webglcontextlost",Zt,!1),e.removeEventListener("webglcontextrestored",_e,!1),e.removeEventListener("webglcontextcreationerror",oe,!1),kt.dispose(),Ut.dispose(),gt.dispose(),N.dispose(),et.dispose(),X.dispose(),mt.dispose(),Et.dispose(),K.dispose(),vt.dispose(),vt.removeEventListener("sessionstart",xh),vt.removeEventListener("sessionend",vh),hi.stop()};function Zt(M){M.preventDefault(),Xs("WebGLRenderer: Context Lost."),O=!0}function _e(){Xs("WebGLRenderer: Context Restored."),O=!1;let M=y.autoReset,U=zt.enabled,V=zt.autoUpdate,B=zt.needsUpdate,z=zt.type;nt(),y.autoReset=M,zt.enabled=U,zt.autoUpdate=V,zt.needsUpdate=B,zt.type=z}function oe(M){Lt("WebGLRenderer: A WebGL context could not be created. Reason: ",M.statusMessage)}function yn(M){let U=M.target;U.removeEventListener("dispose",yn),Ln(U)}function Ln(M){Jp(M),N.remove(M)}function Jp(M){let U=N.get(M).programs;if(U!==void 0){if(U.forEach(function(V){K.releaseProgram(V)}),M.isShaderMaterial)K.releaseShaderCache(M)}}this.renderBufferDirect=function(M,U,V,B,z,Mt){if(U===null)U=Bt;let wt=z.isMesh&&z.matrixWorld.determinantAffine()<0,yt=Qp(M,U,V,B,z);A.setMaterial(B,wt);let Rt=V.index,Pt=1;if(B.wireframe===!0){if(Rt=ft.getWireframeAttribute(V),Rt===void 0)return;Pt=2}let Kt=V.drawRange,ee=V.attributes.position,It=Kt.start*Pt,le=(Kt.start+Kt.count)*Pt;if(Mt!==null)It=Math.max(It,Mt.start*Pt),le=Math.min(le,(Mt.start+Mt.count)*Pt);if(Rt!==null)It=Math.max(It,0),le=Math.min(le,Rt.count);else if(ee!==void 0&&ee!==null)It=Math.max(It,0),le=Math.min(le,ee.count);let Ae=le-It;if(Ae<0||Ae===1/0)return;mt.setup(z,B,yt,V,Rt);let ve,me=D;if(Rt!==null)ve=ht.get(Rt),me=pt,me.setIndex(ve);if(z.isMesh)if(B.wireframe===!0)A.setLineWidth(B.wireframeLinewidth*Yt()),me.setMode(I.LINES);else me.setMode(I.TRIANGLES);else if(z.isLine){let Oe=B.linewidth;if(Oe===void 0)Oe=1;if(A.setLineWidth(Oe*Yt()),z.isLineSegments)me.setMode(I.LINES);else if(z.isLineLoop)me.setMode(I.LINE_LOOP);else me.setMode(I.LINE_STRIP)}else if(z.isPoints)me.setMode(I.POINTS);else if(z.isSprite)me.setMode(I.TRIANGLES);if(z.isBatchedMesh)if(!jt.get("WEBGL_multi_draw")){let{_multiDrawStarts:Oe,_multiDrawCounts:At,_multiDrawCount:We}=z,ie=Rt?ht.get(Rt).bytesPerElement:1,an=N.get(B).currentProgram.getUniforms();for(let Sn=0;Sn<We;Sn++)an.setValue(I,"_gl_DrawID",Sn),me.render(Oe[Sn]/ie,At[Sn])}else me.renderMultiDraw(z._multiDrawStarts,z._multiDrawCounts,z._multiDrawCount);else if(z.isInstancedMesh)me.renderInstances(It,Ae,z.count);else if(V.isInstancedBufferGeometry){let Oe=V._maxInstanceCount!==void 0?V._maxInstanceCount:1/0,At=Math.min(V.instanceCount,Oe);me.renderInstances(It,Ae,At)}else me.render(It,Ae)};function _h(M,U,V,B){if(L!==null&&M.isNodeMaterial)L.setObject(B,M);if(st===!0)ut.setState(M,V,!1);if(M.transparent===!0&&M.side===wn&&M.forceSinglePass===!1)M.side=Ke,M.needsUpdate=!0,Sr(M,U,B),M.side=ms,M.needsUpdate=!0,Sr(M,U,B),M.side=wn;else Sr(M,U,B)}this.compile=function(M,U,V=null){if(V===null)V=M;if(L!==null)L.renderStart(M,U,V);if(T=gt.get(V),T.init(U),w.push(T),V.traverseVisible(function(z){if(z.isLight&&z.layers.test(U.layers)){if(T.pushLight(z),z.castShadow)T.pushShadow(z)}}),M!==V)M.traverseVisible(function(z){if(z.isLight&&z.layers.test(U.layers)){if(T.pushLight(z),z.castShadow)T.pushShadow(z)}});if(T.setupLights(),L!==null)L.updateLights(T.state.lightsArray);if(ot=this.localClippingEnabled,st=ut.init(this.clippingPlanes,ot),st===!0)ut.setGlobalState(this.clippingPlanes,U);if(L!==null)zt.render(T.state.shadowsArray,V,U);let B=new Set;if(M.traverse(function(z){if(!(z.isMesh||z.isPoints||z.isLine||z.isSprite))return;let Mt=z.material;if(Mt)if(Array.isArray(Mt))for(let wt=0;wt<Mt.length;wt++){let yt=Mt[wt];_h(yt,V,U,z),B.add(yt)}else _h(Mt,V,U,z),B.add(Mt)}),T=w.pop(),L!==null)L.renderEnd();return B},this.compileAsync=function(M,U,V=null){let B=this.compile(M,U,V);return new Promise((z)=>{function Mt(){if(B.forEach(function(wt){let Rt=N.get(wt).currentProgram;if(Rt===void 0||Rt.isReady())B.delete(wt)}),B.size===0){z(M);return}setTimeout(Mt,10)}if(jt.get("KHR_parallel_shader_compile")!==null)Mt();else setTimeout(Mt,10)})};let vo=null;function $p(M){if(vo)vo(M)}function xh(){hi.stop()}function vh(){hi.start()}let hi=new Lp;if(hi.setAnimationLoop($p),typeof self<"u")hi.setContext(self);this.setAnimationLoop=function(M){vo=M,vt.setAnimationLoop(M),M===null?hi.stop():hi.start()},vt.addEventListener("sessionstart",xh),vt.addEventListener("sessionend",vh),this.render=function(M,U){if(U!==void 0&&U.isCamera!==!0){Lt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(O===!0)return;if(L!==null)L.renderStart(M,U);let V=vt.enabled===!0&&vt.isPresenting===!0,B=v!==null&&(k===null||V)&&v.begin(b,k);if(M.matrixWorldAutoUpdate===!0)M.updateMatrixWorld();if(U.parent===null&&U.matrixWorldAutoUpdate===!0)U.updateMatrixWorld();if(vt.enabled===!0&&vt.isPresenting===!0&&(v===null||v.isCompositing()===!1)){if(vt.cameraAutoUpdate===!0)vt.updateCamera(U);U=vt.getCamera()}if(M.isScene===!0)M.onBeforeRender(b,M,U,k);if(T=gt.get(M,w.length),T.init(U),T.state.textureUnits=H.getTextureUnits(),w.push(T),ct.multiplyMatrices(U.projectionMatrix,U.matrixWorldInverse),tt.setFromProjectionMatrix(ct,rc,U.reversedDepth),ot=this.localClippingEnabled,st=ut.init(this.clippingPlanes,ot),x=Ut.get(M,C.length),x.init(),C.push(x),vt.enabled===!0&&vt.isPresenting===!0){let wt=b.xr.getDepthSensingMesh();if(wt!==null)yo(wt,U,-1/0,b.sortObjects)}if(yo(M,U,0,b.sortObjects),x.finish(),L!==null)L.updateLights(T.state.lightsArray);if(b.sortObjects===!0)x.sort(rt,Ot);if(qt=vt.enabled===!1||vt.isPresenting===!1||vt.hasDepthSensing()===!1,qt)kt.addToRenderList(x,M);if(this.info.render.frame++,this.info.autoReset===!0)this.info.reset();if(st===!0)ut.beginShadows();let z=T.state.shadowsArray;if(zt.render(z,M,U),st===!0)ut.endShadows();if((B&&v.hasRenderPass())===!1){let wt=x.opaque,yt=x.transmissive;if(T.setupLights(),U.isArrayCamera){let Rt=U.cameras;if(yt.length>0)for(let Pt=0,Kt=Rt.length;Pt<Kt;Pt++){let ee=Rt[Pt];Sh(wt,yt,M,ee)}if(qt)kt.render(M);for(let Pt=0,Kt=Rt.length;Pt<Kt;Pt++){let ee=Rt[Pt];yh(x,M,ee,ee.viewport)}}else{if(yt.length>0)Sh(wt,yt,M,U);if(qt)kt.render(M);yh(x,M,U)}}if(k!==null&&J===0)H.updateMultisampleRenderTarget(k),H.updateRenderTargetMipmap(k);if(B)v.end(b);if(M.isScene===!0)M.onAfterRender(b,M,U);if(mt.resetDefaultState(),at=-1,W=null,w.pop(),w.length>0){if(T=w[w.length-1],H.setTextureUnits(T.state.textureUnits),st===!0)ut.setGlobalState(b.clippingPlanes,T.state.camera)}else T=null;if(C.pop(),C.length>0)x=C[C.length-1];else x=null;if(L!==null)L.renderEnd()};function yo(M,U,V,B){if(M.visible===!1)return;if(M.layers.test(U.layers)){if(M.isGroup)V=M.renderOrder;else if(M.isLOD){if(M.autoUpdate===!0)M.update(U)}else if(M.isLightProbeGrid)T.pushLightProbeGrid(M);else if(M.isLight){if(T.pushLight(M),M.castShadow)T.pushShadow(M)}else if(M.isSprite){if(!M.frustumCulled||M.intersectsFrustum(tt)){if(B)Nt.setFromMatrixPosition(M.matrixWorld).applyMatrix4(ct);let wt=X.update(M),yt=M.material;if(yt.visible)x.push(M,wt,yt,V,Nt.z,null,U)}}else if(M.isMesh||M.isLine||M.isPoints){if(!M.frustumCulled||M.intersectsFrustum(tt)){let wt=X.update(M),yt=M.material;if(B){if(M.boundingSphere!==void 0){if(M.boundingSphere===null)M.computeBoundingSphere();Nt.copy(M.boundingSphere.center)}else{if(wt.boundingSphere===null)wt.computeBoundingSphere();Nt.copy(wt.boundingSphere.center)}Nt.applyMatrix4(M.matrixWorld).applyMatrix4(ct)}if(Array.isArray(yt)){let Rt=wt.groups;for(let Pt=0,Kt=Rt.length;Pt<Kt;Pt++){let ee=Rt[Pt],It=yt[ee.materialIndex];if(It&&It.visible)x.push(M,wt,It,V,Nt.z,ee,U)}}else if(yt.visible)x.push(M,wt,yt,V,Nt.z,null,U)}}}let Mt=M.children;for(let wt=0,yt=Mt.length;wt<yt;wt++)yo(Mt[wt],U,V,B)}function yh(M,U,V,B){let{opaque:z,transmissive:Mt,transparent:wt}=M;if(T.setupLightsView(V),st===!0)ut.setGlobalState(b.clippingPlanes,V);if(B)A.viewport(Q.copy(B));if(z.length>0)yr(z,U,V);if(Mt.length>0)yr(Mt,U,V);if(wt.length>0)yr(wt,U,V);A.buffers.depth.setTest(!0),A.buffers.depth.setMask(!0),A.buffers.color.setMask(!0),A.setPolygonOffset(!1)}function Sh(M,U,V,B){if((V.isScene===!0?V.overrideMaterial:null)!==null)return;if(T.state.transmissionRenderTarget[B.id]===void 0){let It=jt.has("EXT_color_buffer_half_float")||jt.has("EXT_color_buffer_float");T.state.transmissionRenderTarget[B.id]=new Ce(1,1,{generateMipmaps:!0,type:It?je:_n,minFilter:Ci,samples:Math.max(4,te.samples),stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:ne.workingColorSpace})}let Mt=T.state.transmissionRenderTarget[B.id],wt=B.viewport||Q;Mt.setSize(wt.z*b.transmissionResolutionScale,wt.w*b.transmissionResolutionScale);let yt=b.getRenderTarget(),Rt=b.getActiveCubeFace(),Pt=b.getActiveMipmapLevel();if(b.setRenderTarget(Mt),b.getClearColor(Ft),he=b.getClearAlpha(),he<1)b.setClearColor(16777215,0.5);if(b.clear(),qt)kt.render(V);let Kt=b.toneMapping;b.toneMapping=gn;let ee=B.viewport;if(B.viewport!==void 0)B.viewport=void 0;if(T.setupLightsView(B),st===!0)ut.setGlobalState(b.clippingPlanes,B);if(yr(M,V,B),H.updateMultisampleRenderTarget(Mt),H.updateRenderTargetMipmap(Mt),jt.has("WEBGL_multisampled_render_to_texture")===!1){let It=!1;for(let le=0,Ae=U.length;le<Ae;le++){let ve=U[le],{object:me,geometry:Oe,material:At,group:We}=ve;if(At.side===wn&&me.layers.test(B.layers)){let ie=At.side;At.side=Ke,At.needsUpdate=!0,Mh(me,V,B,Oe,At,We),At.side=ie,At.needsUpdate=!0,It=!0}}if(It===!0)H.updateMultisampleRenderTarget(Mt),H.updateRenderTargetMipmap(Mt)}if(b.setRenderTarget(yt,Rt,Pt),b.setClearColor(Ft,he),ee!==void 0)B.viewport=ee;b.toneMapping=Kt}function yr(M,U,V){let B=U.isScene===!0?U.overrideMaterial:null;for(let z=0,Mt=M.length;z<Mt;z++){let wt=M[z],{object:yt,geometry:Rt,group:Pt}=wt,Kt=wt.material;if(Kt.allowOverride===!0&&B!==null)Kt=B;if(yt.layers.test(V.layers))Mh(yt,U,V,Rt,Kt,Pt)}}function Mh(M,U,V,B,z,Mt){if(L!==null&&z.isNodeMaterial)L.setObject(M,z);if(M.onBeforeRender(b,U,V,B,z,Mt),M.modelViewMatrix.multiplyMatrices(V.matrixWorldInverse,M.matrixWorld),M.normalMatrix.getNormalMatrix(M.modelViewMatrix),z.onBeforeRender(b,U,V,B,M,Mt),z.transparent===!0&&z.side===wn&&z.forceSinglePass===!1)z.side=Ke,z.needsUpdate=!0,b.renderBufferDirect(V,U,B,z,M,Mt),z.side=ms,z.needsUpdate=!0,b.renderBufferDirect(V,U,B,z,M,Mt),z.side=wn;else b.renderBufferDirect(V,U,B,z,M,Mt);M.onAfterRender(b,U,V,B,z,Mt)}function Sr(M,U,V){if(U.isScene!==!0)U=Bt;let B=N.get(M),z=T.state.lights,Mt=T.state.shadowsArray,wt=z.state.version,yt=K.getParameters(M,z.state,Mt,U,V,T.state.lightProbeGridArray),Rt=K.getProgramCacheKey(yt),Pt=B.programs;B.environment=M.isMeshStandardMaterial||M.isMeshLambertMaterial||M.isMeshPhongMaterial?U.environment:null,B.fog=U.fog;let Kt=M.isMeshStandardMaterial||M.isMeshLambertMaterial&&!M.envMap||M.isMeshPhongMaterial&&!M.envMap;if(B.envMap=et.get(M.envMap||B.environment,Kt),B.envMapRotation=B.environment!==null&&M.envMap===null?U.environmentRotation:M.envMapRotation,Pt===void 0)M.addEventListener("dispose",yn),Pt=new Map,B.programs=Pt;let ee=Pt.get(Rt);if(ee!==void 0){if(B.currentProgram===ee&&B.lightsStateVersion===wt)return Th(M,yt),ee}else{if(yt.uniforms=K.getUniforms(M),L!==null&&M.isNodeMaterial)L.build(M,V,yt);M.onBeforeCompile(yt,b),ee=K.acquireProgram(yt,Rt),Pt.set(Rt,ee),B.uniforms=yt.uniforms}let It=B.uniforms;if(!M.isShaderMaterial&&!M.isRawShaderMaterial||M.clipping===!0)It.clippingPlanes=ut.uniform;if(Th(M,yt),B.needsLights=tm(M),B.lightsStateVersion=wt,B.needsLights)It.ambientLightColor.value=z.state.ambient,It.lightProbe.value=z.state.probe,It.sunLights.value=z.state.sun,It.sunLightShadows.value=z.state.sunShadow,It.directionalLights.value=z.state.directional,It.directionalLightShadows.value=z.state.directionalShadow,It.spotLights.value=z.state.spot,It.spotLightShadows.value=z.state.spotShadow,It.rectAreaLights.value=z.state.rectArea,It.ltc_1.value=z.state.rectAreaLTC1,It.ltc_2.value=z.state.rectAreaLTC2,It.pointLights.value=z.state.point,It.pointLightShadows.value=z.state.pointShadow,It.hemisphereLights.value=z.state.hemi,It.sunShadowMatrix.value=z.state.sunShadowMatrix,It.sunShadowCascade.value=z.state.sunShadowCascade,It.directionalShadowMatrix.value=z.state.directionalShadowMatrix,It.spotLightMatrix.value=z.state.spotLightMatrix,It.spotLightMap.value=z.state.spotLightMap,It.pointShadowMatrix.value=z.state.pointShadowMatrix;return B.lightProbeGrid=T.state.lightProbeGridArray.length>0,B.currentProgram=ee,B.uniformsList=null,ee}function bh(M){if(M.uniformsList===null){let U=M.currentProgram.getUniforms();M.uniformsList=vr.seqWithValue(U.seq,M.uniforms)}return M.uniformsList}function Th(M,U){let V=N.get(M);V.outputColorSpace=U.outputColorSpace,V.batching=U.batching,V.batchingColor=U.batchingColor,V.instancing=U.instancing,V.instancingColor=U.instancingColor,V.instancingMorph=U.instancingMorph,V.skinning=U.skinning,V.morphTargets=U.morphTargets,V.morphNormals=U.morphNormals,V.morphColors=U.morphColors,V.morphTargetsCount=U.morphTargetsCount,V.numClippingPlanes=U.numClippingPlanes,V.numIntersection=U.numClipIntersection,V.vertexAlphas=U.vertexAlphas,V.vertexTangents=U.vertexTangents,V.toneMapping=U.toneMapping}function Kp(M,U){if(M.length===0)return null;if(M.length===1)return M[0].texture!==null?M[0]:null;E.setFromMatrixPosition(U.matrixWorld);for(let V=0,B=M.length;V<B;V++){let z=M[V];if(z.texture!==null&&z.boundingBox.containsPoint(E))return z}return null}function Qp(M,U,V,B,z){if(U.isScene!==!0)U=Bt;H.resetTextureUnits();let Mt=U.fog,wt=B.isMeshStandardMaterial||B.isMeshLambertMaterial||B.isMeshPhongMaterial?U.environment:null,yt=k===null?b.outputColorSpace:k.isXRRenderTarget===!0?k.texture.colorSpace:ne.workingColorSpace,Rt=B.isMeshStandardMaterial||B.isMeshLambertMaterial&&!B.envMap||B.isMeshPhongMaterial&&!B.envMap,Pt=et.get(B.envMap||wt,Rt),Kt=B.vertexColors===!0&&!!V.attributes.color&&V.attributes.color.itemSize===4,ee=!!V.attributes.tangent&&(!!B.normalMap||B.anisotropy>0),It=!!V.morphAttributes.position,le=!!V.morphAttributes.normal,Ae=!!V.morphAttributes.color,ve=gn;if(B.toneMapped){if(k===null||k.isXRRenderTarget===!0)ve=b.toneMapping}let me=V.morphAttributes.position||V.morphAttributes.normal||V.morphAttributes.color,Oe=me!==void 0?me.length:0,At=N.get(B),We=T.state.lights;if(st===!0){if(ot===!0||M!==W){let xe=M===W&&B.id===at;ut.setState(B,M,xe)}}let ie=!1;if(B.version===At.__version){if(At.needsLights&&At.lightsStateVersion!==We.state.version)ie=!0;else if(At.outputColorSpace!==yt)ie=!0;else if(z.isBatchedMesh&&At.batching===!1)ie=!0;else if(!z.isBatchedMesh&&At.batching===!0)ie=!0;else if(z.isBatchedMesh&&At.batchingColor===!0&&z._colorsTexture===null)ie=!0;else if(z.isBatchedMesh&&At.batchingColor===!1&&z._colorsTexture!==null)ie=!0;else if(z.isInstancedMesh&&At.instancing===!1)ie=!0;else if(!z.isInstancedMesh&&At.instancing===!0)ie=!0;else if(z.isSkinnedMesh&&At.skinning===!1)ie=!0;else if(!z.isSkinnedMesh&&At.skinning===!0)ie=!0;else if(z.isInstancedMesh&&At.instancingColor===!0&&z.instanceColor===null)ie=!0;else if(z.isInstancedMesh&&At.instancingColor===!1&&z.instanceColor!==null)ie=!0;else if(z.isInstancedMesh&&At.instancingMorph===!0&&z.morphTexture===null)ie=!0;else if(z.isInstancedMesh&&At.instancingMorph===!1&&z.morphTexture!==null)ie=!0;else if(At.envMap!==Pt)ie=!0;else if(B.fog===!0&&At.fog!==Mt)ie=!0;else if(At.numClippingPlanes!==void 0&&(At.numClippingPlanes!==ut.numPlanes||At.numIntersection!==ut.numIntersection))ie=!0;else if(At.vertexAlphas!==Kt)ie=!0;else if(At.vertexTangents!==ee)ie=!0;else if(At.morphTargets!==It)ie=!0;else if(At.morphNormals!==le)ie=!0;else if(At.morphColors!==Ae)ie=!0;else if(At.toneMapping!==ve)ie=!0;else if(At.morphTargetsCount!==Oe)ie=!0;else if(!!At.lightProbeGrid!==T.state.lightProbeGridArray.length>0)ie=!0}else ie=!0,At.__version=B.version;let an=At.currentProgram;if(ie===!0){if(an=Sr(B,U,z),L&&B.isNodeMaterial)L.onUpdateProgram(B,an,At)}let Sn=!1,Xn=!1,zi=!1,pe=an.getUniforms(),Te=At.uniforms;if(A.useProgram(an.program))Sn=!0,Xn=!0,zi=!0;if(B.id!==at)at=B.id,Xn=!0;if(At.needsLights){let xe=Kp(T.state.lightProbeGridArray,z);if(At.lightProbeGrid!==xe)At.lightProbeGrid=xe,Xn=!0}if(Sn||W!==M){if(A.buffers.depth.getReversed()&&M.reversedDepth!==!0)M._reversedDepth=!0,M.updateProjectionMatrix();pe.setValue(I,"projectionMatrix",M.projectionMatrix),pe.setValue(I,"viewMatrix",M.matrixWorldInverse);let Yn=pe.map.cameraPosition;if(Yn!==void 0)Yn.setValue(I,St.setFromMatrixPosition(M.matrixWorld));if(te.logarithmicDepthBuffer)pe.setValue(I,"logDepthBufFC",2/(Math.log(M.far+1)/Math.LN2));if(B.isMeshPhongMaterial||B.isMeshToonMaterial||B.isMeshLambertMaterial||B.isMeshBasicMaterial||B.isMeshStandardMaterial||B.isShaderMaterial)pe.setValue(I,"isOrthographic",M.isOrthographicCamera===!0);if(W!==M)W=M,Xn=!0,zi=!0}if(At.needsLights){if(We.state.sunShadowMap.length>0)pe.setValue(I,"sunShadowMap",We.state.sunShadowMap,H);if(We.state.directionalShadowMap.length>0)pe.setValue(I,"directionalShadowMap",We.state.directionalShadowMap,H);if(We.state.spotShadowMap.length>0)pe.setValue(I,"spotShadowMap",We.state.spotShadowMap,H);if(We.state.pointShadowMap.length>0)pe.setValue(I,"pointShadowMap",We.state.pointShadowMap,H)}if(z.isSkinnedMesh){pe.setOptional(I,z,"bindMatrix"),pe.setOptional(I,z,"bindMatrixInverse");let xe=z.skeleton;if(xe){if(xe.boneTexture===null)xe.computeBoneTexture();pe.setValue(I,"boneTexture",xe.boneTexture,H)}}if(z.isBatchedMesh){if(pe.setOptional(I,z,"batchingTexture"),pe.setValue(I,"batchingTexture",z._matricesTexture,H),pe.setOptional(I,z,"batchingIdTexture"),pe.setValue(I,"batchingIdTexture",z._indirectTexture,H),pe.setOptional(I,z,"batchingColorTexture"),z._colorsTexture!==null)pe.setValue(I,"batchingColorTexture",z._colorsTexture,H)}let qn=V.morphAttributes;if(qn.position!==void 0||qn.normal!==void 0||qn.color!==void 0)ae.update(z,V,an);if(Xn||At.receiveShadow!==z.receiveShadow)At.receiveShadow=z.receiveShadow,pe.setValue(I,"receiveShadow",z.receiveShadow);if((B.isMeshStandardMaterial||B.isMeshLambertMaterial||B.isMeshPhongMaterial)&&B.envMap===null&&U.environment!==null)Te.envMapIntensity.value=U.environmentIntensity;if(Te.dfgLUT!==void 0)Te.dfgLUT.value=QS();if(Xn){if(pe.setValue(I,"toneMappingExposure",b.toneMappingExposure),At.needsLights)jp(Te,zi);if(Mt&&B.fog===!0)bt.refreshFogUniforms(Te,Mt);if(bt.refreshMaterialUniforms(Te,B,lt,q,T.state.transmissionRenderTarget[M.id]),At.needsLights&&At.lightProbeGrid){let xe=At.lightProbeGrid;Te.probesSH.value=xe.texture,Te.probesMin.value.copy(xe.boundingBox.min),Te.probesMax.value.copy(xe.boundingBox.max),Te.probesResolution.value.copy(xe.resolution)}vr.upload(I,bh(At),Te,H)}if(B.isShaderMaterial&&B.uniformsNeedUpdate===!0)vr.upload(I,bh(At),Te,H),B.uniformsNeedUpdate=!1;if(B.isSpriteMaterial)pe.setValue(I,"center",z.center);if(pe.setValue(I,"modelViewMatrix",z.modelViewMatrix),pe.setValue(I,"normalMatrix",z.normalMatrix),pe.setValue(I,"modelMatrix",z.matrixWorld),B.uniformsGroups!==void 0){let xe=B.uniformsGroups;for(let Yn=0,Gi=xe.length;Yn<Gi;Yn++){let Ah=xe[Yn];Et.update(Ah,an),Et.bind(Ah,an)}}return an}function jp(M,U){M.ambientLightColor.needsUpdate=U,M.lightProbe.needsUpdate=U,M.sunLights.needsUpdate=U,M.sunLightShadows.needsUpdate=U,M.directionalLights.needsUpdate=U,M.directionalLightShadows.needsUpdate=U,M.pointLights.needsUpdate=U,M.pointLightShadows.needsUpdate=U,M.spotLights.needsUpdate=U,M.spotLightShadows.needsUpdate=U,M.rectAreaLights.needsUpdate=U,M.hemisphereLights.needsUpdate=U}function tm(M){return M.isMeshLambertMaterial||M.isMeshToonMaterial||M.isMeshPhongMaterial||M.isMeshStandardMaterial||M.isShadowMaterial||M.isShaderMaterial&&M.lights===!0}this.getActiveCubeFace=function(){return G},this.getActiveMipmapLevel=function(){return J},this.getRenderTarget=function(){return k},this.setRenderTargetTextures=function(M,U,V){let B=N.get(M);if(B.__autoAllocateDepthBuffer=M.resolveDepthBuffer===!1,B.__autoAllocateDepthBuffer===!1)B.__useRenderToTexture=!1;N.get(M.texture).__webglTexture=U,N.get(M.depthTexture).__webglTexture=B.__autoAllocateDepthBuffer?void 0:V,B.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(M,U){let V=N.get(M);V.__webglFramebuffer=U,V.__useDefaultFramebuffer=U===void 0},this.setRenderTarget=function(M,U=0,V=0){k=M,G=U,J=V;let B=null,z=!1,Mt=!1;if(M){let yt=N.get(M);if(yt.__useDefaultFramebuffer!==void 0){A.bindFramebuffer(I.FRAMEBUFFER,yt.__webglFramebuffer),Q.copy(M.viewport),it.copy(M.scissor),Dt=M.scissorTest,A.viewport(Q),A.scissor(it),A.setScissorTest(Dt),at=-1;return}else if(yt.__webglFramebuffer===void 0)H.setupRenderTarget(M);else if(yt.__hasExternalTextures)H.rebindTextures(M,N.get(M.texture).__webglTexture,N.get(M.depthTexture).__webglTexture);else if(M.depthBuffer){let Kt=M.depthTexture;if(yt.__boundDepthTexture!==Kt){if(Kt!==null&&N.has(Kt)&&(M.width!==Kt.image.width||M.height!==Kt.image.height))throw Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");H.setupDepthRenderbuffer(M)}}let Rt=M.texture;if(Rt.isData3DTexture||Rt.isDataArrayTexture||Rt.isCompressedArrayTexture)Mt=!0;let Pt=N.get(M).__webglFramebuffer;if(M.isWebGLCubeRenderTarget){if(Array.isArray(Pt[U]))B=Pt[U][V];else B=Pt[U];z=!0}else if(M.samples>0&&H.useMultisampledRTT(M)===!1)B=N.get(M).__webglMultisampledFramebuffer;else if(Array.isArray(Pt))B=Pt[V];else B=Pt;Q.copy(M.viewport),it.copy(M.scissor),Dt=M.scissorTest}else Q.copy(Gt).multiplyScalar(lt).floor(),it.copy(Ct).multiplyScalar(lt).floor(),Dt=ue;if(V!==0)B=F;if(A.bindFramebuffer(I.FRAMEBUFFER,B))A.drawBuffers(M,B);if(A.viewport(Q),A.scissor(it),A.setScissorTest(Dt),z){let yt=N.get(M.texture);I.framebufferTexture2D(I.FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_CUBE_MAP_POSITIVE_X+U,yt.__webglTexture,V)}else if(Mt){let yt=U;for(let Rt=0;Rt<M.textures.length;Rt++){let Pt=N.get(M.textures[Rt]);I.framebufferTextureLayer(I.FRAMEBUFFER,I.COLOR_ATTACHMENT0+Rt,Pt.__webglTexture,V,yt)}}else if(M!==null&&V!==0){let yt=N.get(M.texture);I.framebufferTexture2D(I.FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_2D,yt.__webglTexture,V)}at=-1};function Eh(M){let U=N.get(M);if(U.__readFormat!==M.format||U.__readType!==M.type)U.__readFormat=M.format,U.__readType=M.type,U.__formatReadable=te.textureFormatReadable(M.format),U.__typeReadable=te.textureTypeReadable(M.type);return U}if(this.readRenderTargetPixels=function(M,U,V,B,z,Mt,wt,yt=0){if(!(M&&M.isWebGLRenderTarget)){Lt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Rt=N.get(M).__webglFramebuffer;if(M.isWebGLCubeRenderTarget&&wt!==void 0)Rt=Rt[wt];if(Rt){A.bindFramebuffer(I.FRAMEBUFFER,Rt);try{let Pt=M.textures[yt],{format:Kt,type:ee}=Pt;if(M.textures.length>1)I.readBuffer(I.COLOR_ATTACHMENT0+yt);let It=Eh(Pt);if(It.__formatReadable===!1){Lt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(It.__typeReadable===!1){Lt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}if(U>=0&&U<=M.width-B&&(V>=0&&V<=M.height-z))I.readPixels(U,V,B,z,Y.convert(Kt),Y.convert(ee),Mt)}finally{let Pt=k!==null?N.get(k).__webglFramebuffer:null;A.bindFramebuffer(I.FRAMEBUFFER,Pt)}}},this.readRenderTargetPixelsAsync=async function(M,U,V,B,z,Mt,wt,yt=0){if(!(M&&M.isWebGLRenderTarget))throw Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Rt=N.get(M).__webglFramebuffer;if(M.isWebGLCubeRenderTarget&&wt!==void 0)Rt=Rt[wt];if(Rt)if(U>=0&&U<=M.width-B&&(V>=0&&V<=M.height-z)){A.bindFramebuffer(I.FRAMEBUFFER,Rt);let Pt=M.textures[yt],{format:Kt,type:ee}=Pt;if(M.textures.length>1)I.readBuffer(I.COLOR_ATTACHMENT0+yt);let It=Eh(Pt);if(It.__formatReadable===!1)throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(It.__typeReadable===!1)throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let le=I.createBuffer();I.bindBuffer(I.PIXEL_PACK_BUFFER,le),I.bufferData(I.PIXEL_PACK_BUFFER,Mt.byteLength,I.STREAM_READ),I.readPixels(U,V,B,z,Y.convert(Kt),Y.convert(ee),0),I.bindBuffer(I.PIXEL_PACK_BUFFER,null);let Ae=k!==null?N.get(k).__webglFramebuffer:null;A.bindFramebuffer(I.FRAMEBUFFER,Ae);let ve=I.fenceSync(I.SYNC_GPU_COMMANDS_COMPLETE,0);return I.flush(),await Hd(I,ve,4),I.bindBuffer(I.PIXEL_PACK_BUFFER,le),I.getBufferSubData(I.PIXEL_PACK_BUFFER,0,Mt),I.bindBuffer(I.PIXEL_PACK_BUFFER,null),I.deleteBuffer(le),I.deleteSync(ve),Mt}else throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(M,U=null,V=0){let B=Math.pow(2,-V),z=Math.floor(M.image.width*B),Mt=Math.floor(M.image.height*B),wt=U!==null?U.x:0,yt=U!==null?U.y:0;H.setTexture2D(M,0),I.copyTexSubImage2D(I.TEXTURE_2D,V,0,0,wt,yt,z,Mt),A.unbindTexture()},this.copyTextureToTexture=function(M,U,V=null,B=null,z=0,Mt=0){let wt,yt,Rt,Pt,Kt,ee,It,le,Ae,ve=M.isCompressedTexture?M.mipmaps[Mt]:M.image;if(V!==null)wt=V.max.x-V.min.x,yt=V.max.y-V.min.y,Rt=V.isBox3?V.max.z-V.min.z:1,Pt=V.min.x,Kt=V.min.y,ee=V.isBox3?V.min.z:0;else{let Te=Math.pow(2,-z);if(wt=Math.floor(ve.width*Te),yt=Math.floor(ve.height*Te),M.isDataArrayTexture)Rt=ve.depth;else if(M.isData3DTexture)Rt=Math.floor(ve.depth*Te);else Rt=1;Pt=0,Kt=0,ee=0}if(B!==null)It=B.x,le=B.y,Ae=B.z;else It=0,le=0,Ae=0;let me=Y.convert(U.format),Oe=Y.convert(U.type),At;if(U.isData3DTexture)H.setTexture3D(U,0),At=I.TEXTURE_3D;else if(U.isDataArrayTexture||U.isCompressedArrayTexture)H.setTexture2DArray(U,0),At=I.TEXTURE_2D_ARRAY;else H.setTexture2D(U,0),At=I.TEXTURE_2D;A.activeTexture(I.TEXTURE0),A.pixelStorei(I.UNPACK_FLIP_Y_WEBGL,U.flipY),A.pixelStorei(I.UNPACK_PREMULTIPLY_ALPHA_WEBGL,U.premultiplyAlpha),A.pixelStorei(I.UNPACK_ALIGNMENT,U.unpackAlignment);let We=A.getParameter(I.UNPACK_ROW_LENGTH),ie=A.getParameter(I.UNPACK_IMAGE_HEIGHT),an=A.getParameter(I.UNPACK_SKIP_PIXELS),Sn=A.getParameter(I.UNPACK_SKIP_ROWS),Xn=A.getParameter(I.UNPACK_SKIP_IMAGES);A.pixelStorei(I.UNPACK_ROW_LENGTH,ve.width),A.pixelStorei(I.UNPACK_IMAGE_HEIGHT,ve.height),A.pixelStorei(I.UNPACK_SKIP_PIXELS,Pt),A.pixelStorei(I.UNPACK_SKIP_ROWS,Kt),A.pixelStorei(I.UNPACK_SKIP_IMAGES,ee);let zi=M.isDataArrayTexture||M.isData3DTexture,pe=U.isDataArrayTexture||U.isData3DTexture;if(M.isDepthTexture){let Te=N.get(M),qn=N.get(U),xe=N.get(Te.__renderTarget),Yn=N.get(qn.__renderTarget);A.bindFramebuffer(I.READ_FRAMEBUFFER,xe.__webglFramebuffer),A.bindFramebuffer(I.DRAW_FRAMEBUFFER,Yn.__webglFramebuffer);for(let Gi=0;Gi<Rt;Gi++){if(zi)I.framebufferTextureLayer(I.READ_FRAMEBUFFER,I.COLOR_ATTACHMENT0,N.get(M).__webglTexture,z,ee+Gi),I.framebufferTextureLayer(I.DRAW_FRAMEBUFFER,I.COLOR_ATTACHMENT0,N.get(U).__webglTexture,Mt,Ae+Gi);I.blitFramebuffer(Pt,Kt,wt,yt,It,le,wt,yt,I.DEPTH_BUFFER_BIT,I.NEAREST)}A.bindFramebuffer(I.READ_FRAMEBUFFER,null),A.bindFramebuffer(I.DRAW_FRAMEBUFFER,null)}else if(z!==0||M.isRenderTargetTexture||N.has(M)){let Te=N.get(M),qn=N.get(U);A.bindFramebuffer(I.READ_FRAMEBUFFER,Z),A.bindFramebuffer(I.DRAW_FRAMEBUFFER,P);for(let xe=0;xe<Rt;xe++){if(zi)I.framebufferTextureLayer(I.READ_FRAMEBUFFER,I.COLOR_ATTACHMENT0,Te.__webglTexture,z,ee+xe);else I.framebufferTexture2D(I.READ_FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_2D,Te.__webglTexture,z);if(pe)I.framebufferTextureLayer(I.DRAW_FRAMEBUFFER,I.COLOR_ATTACHMENT0,qn.__webglTexture,Mt,Ae+xe);else I.framebufferTexture2D(I.DRAW_FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_2D,qn.__webglTexture,Mt);if(z!==0)I.blitFramebuffer(Pt,Kt,wt,yt,It,le,wt,yt,I.COLOR_BUFFER_BIT,I.NEAREST);else if(pe)I.copyTexSubImage3D(At,Mt,It,le,Ae+xe,Pt,Kt,wt,yt);else I.copyTexSubImage2D(At,Mt,It,le,Pt,Kt,wt,yt)}A.bindFramebuffer(I.READ_FRAMEBUFFER,null),A.bindFramebuffer(I.DRAW_FRAMEBUFFER,null)}else if(pe)if(M.isDataTexture||M.isData3DTexture)I.texSubImage3D(At,Mt,It,le,Ae,wt,yt,Rt,me,Oe,ve.data);else if(U.isCompressedArrayTexture)I.compressedTexSubImage3D(At,Mt,It,le,Ae,wt,yt,Rt,me,ve.data);else I.texSubImage3D(At,Mt,It,le,Ae,wt,yt,Rt,me,Oe,ve);else if(M.isDataTexture)I.texSubImage2D(I.TEXTURE_2D,Mt,It,le,wt,yt,me,Oe,ve.data);else if(M.isCompressedTexture)I.compressedTexSubImage2D(I.TEXTURE_2D,Mt,It,le,ve.width,ve.height,me,ve.data);else I.texSubImage2D(I.TEXTURE_2D,Mt,It,le,wt,yt,me,Oe,ve);if(A.pixelStorei(I.UNPACK_ROW_LENGTH,We),A.pixelStorei(I.UNPACK_IMAGE_HEIGHT,ie),A.pixelStorei(I.UNPACK_SKIP_PIXELS,an),A.pixelStorei(I.UNPACK_SKIP_ROWS,Sn),A.pixelStorei(I.UNPACK_SKIP_IMAGES,Xn),Mt===0&&U.generateMipmaps)I.generateMipmap(At);A.unbindTexture()},this.initRenderTarget=function(M){if(N.get(M).__webglFramebuffer===void 0)H.setupRenderTarget(M)},this.initTexture=function(M){if(M.isCubeTexture)H.setTextureCube(M,0);else if(M.isData3DTexture)H.setTexture3D(M,0);else if(M.isDataArrayTexture||M.isCompressedArrayTexture)H.setTexture2DArray(M,0);else H.setTexture2D(M,0);A.unbindTexture()},this.resetState=function(){G=0,J=0,k=null,A.reset(),mt.reset()},typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return rc}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;let e=this.getContext();e.drawingBufferColorSpace=ne._getDrawingBufferColorSpace(t),e.unpackColorSpace=ne._getUnpackColorSpace()}}class mh{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}var tM=new ci(-1,1,1,-1,0,1);class qp extends Wt{constructor(){super();this.setAttribute("position",new Tt([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new Tt([0,2,0,0,2,0],2))}}var eM=new qp;class gh{constructor(t){this._mesh=new Me(eM,t)}dispose(){this._mesh.geometry.dispose()}render(t){t.render(this._mesh,tM)}get material(){return this._mesh.material}set material(t){this._mesh.material=t}}var xo={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};var Yp={name:"LuminosityHighPassShader",uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new _t(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};class As extends mh{constructor(t,e=1,n,i){super();this.strength=e,this.radius=n,this.threshold=i,this.resolution=t!==void 0?new j(t.x,t.y):new j(256,256),this.clearColor=new _t(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let s=Math.round(this.resolution.x/2),r=Math.round(this.resolution.y/2);this.renderTargetBright=new Ce(s,r,{type:je,depthBuffer:!1}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let c=0;c<this.nMips;c++){let h=new Ce(s,r,{type:je,depthBuffer:!1});h.texture.name="UnrealBloomPass.h"+c,h.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(h);let d=new Ce(s,r,{type:je,depthBuffer:!1});d.texture.name="UnrealBloomPass.v"+c,d.texture.generateMipmaps=!1,this.renderTargetsVertical.push(d),s=Math.round(s/2),r=Math.round(r/2)}let a=Yp;this.highPassUniforms=ur.clone(a.uniforms),this.highPassUniforms.luminosityThreshold.value=i,this.highPassUniforms.smoothWidth.value=0.01,this.materialHighPassFilter=new De({uniforms:this.highPassUniforms,vertexShader:a.vertexShader,fragmentShader:a.fragmentShader}),this.separableBlurMaterials=[];let o=[6,10,14,18,22];s=Math.round(this.resolution.x/2),r=Math.round(this.resolution.y/2);for(let c=0;c<this.nMips;c++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(o[c])),this.separableBlurMaterials[c].uniforms.invSize.value=new j(1/s,1/r),s=Math.round(s/2),r=Math.round(r/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=e,this.compositeMaterial.uniforms.bloomRadius.value=0.1;let l=[1,0.8,0.6,0.4,0.2];this.compositeMaterial.uniforms.bloomFactors.value=l,this.bloomTintColors=[new R(1,1,1),new R(1,1,1),new R(1,1,1),new R(1,1,1),new R(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=ur.clone(xo.uniforms),this.blendMaterial=new De({uniforms:this.copyUniforms,vertexShader:xo.vertexShader,fragmentShader:xo.fragmentShader,premultipliedAlpha:!0,blending:Ks,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new _t,this._oldClearAlpha=1,this._basic=new xn,this._fsQuad=new gh(null)}dispose(){for(let t=0;t<this.renderTargetsHorizontal.length;t++)this.renderTargetsHorizontal[t].dispose();for(let t=0;t<this.renderTargetsVertical.length;t++)this.renderTargetsVertical[t].dispose();this.renderTargetBright.dispose();for(let t=0;t<this.separableBlurMaterials.length;t++)this.separableBlurMaterials[t].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(t,e){let n=Math.round(t/2),i=Math.round(e/2);this.renderTargetBright.setSize(n,i);for(let s=0;s<this.nMips;s++)this.renderTargetsHorizontal[s].setSize(n,i),this.renderTargetsVertical[s].setSize(n,i),this.separableBlurMaterials[s].uniforms.invSize.value=new j(1/n,1/i),n=Math.round(n/2),i=Math.round(i/2)}render(t,e,n,i,s){t.getClearColor(this._oldClearColor),this._oldClearAlpha=t.getClearAlpha();let r=t.autoClear;if(t.autoClear=!1,t.setClearColor(this.clearColor,0),s)t.state.buffers.stencil.setTest(!1);if(this.renderToScreen)this._fsQuad.material=this._basic,this._basic.map=n.texture,t.setRenderTarget(null),t.clear(),this._fsQuad.render(t);this.highPassUniforms.tDiffuse.value=n.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,t.setRenderTarget(this.renderTargetBright),t.clear(),this._fsQuad.render(t);let a=this.renderTargetBright;for(let o=0;o<this.nMips;o++)this._fsQuad.material=this.separableBlurMaterials[o],this.separableBlurMaterials[o].uniforms.colorTexture.value=a.texture,this.separableBlurMaterials[o].uniforms.direction.value=As.BlurDirectionX,t.setRenderTarget(this.renderTargetsHorizontal[o]),t.clear(),this._fsQuad.render(t),this.separableBlurMaterials[o].uniforms.colorTexture.value=this.renderTargetsHorizontal[o].texture,this.separableBlurMaterials[o].uniforms.direction.value=As.BlurDirectionY,t.setRenderTarget(this.renderTargetsVertical[o]),t.clear(),this._fsQuad.render(t),a=this.renderTargetsVertical[o];if(this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,t.setRenderTarget(this.renderTargetsHorizontal[0]),t.clear(),this._fsQuad.render(t),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,s)t.state.buffers.stencil.setTest(!0);if(this.renderToScreen)t.setRenderTarget(null),this._fsQuad.render(t);else t.setRenderTarget(n),this._fsQuad.render(t);t.setClearColor(this._oldClearColor,this._oldClearAlpha),t.autoClear=r}_getSeparableBlurMaterial(t){let e=[],n=t/3;for(let r=0;r<t;r++)e.push(0.39894*Math.exp(-0.5*r*r/(n*n))/n);let i=[],s=[];for(let r=1;r<t;r+=2){let a=e[r],o=r+1<t?e[r+1]:0,l=a+o;i.push((r*a+(r+1)*o)/l),s.push(l)}return new De({defines:{KERNEL_PAIRS:i.length},uniforms:{colorTexture:{value:null},invSize:{value:new j(0.5,0.5)},direction:{value:new j(0.5,0.5)},centerWeight:{value:e[0]},gaussianOffsets:{value:i},gaussianWeights:{value:s}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				#include <common>

				varying vec2 vUv;

				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float centerWeight;
				uniform float gaussianOffsets[KERNEL_PAIRS];
				uniform float gaussianWeights[KERNEL_PAIRS];

				void main() {

					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * centerWeight;

					for ( int i = 0; i < KERNEL_PAIRS; i ++ ) {

						vec2 uvOffset = direction * invSize * gaussianOffsets[ i ];
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += ( sample1 + sample2 ) * gaussianWeights[ i ];

					}

					gl_FragColor = vec4( diffuseSum, 1.0 );

				}`})}_getCompositeMaterial(t){return new De({defines:{NUM_MIPS:t},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				varying vec2 vUv;

				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor( const in float factor ) {

					float mirrorFactor = 1.2 - factor;
					return mix( factor, mirrorFactor, bloomRadius );

				}

				void main() {

					// 3.0 for backwards compatibility with previous alpha-based intensity
					vec3 bloom = 3.0 * bloomStrength * (
						lerpBloomFactor( bloomFactors[ 0 ] ) * bloomTintColors[ 0 ] * texture2D( blurTexture1, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 1 ] ) * bloomTintColors[ 1 ] * texture2D( blurTexture2, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 2 ] ) * bloomTintColors[ 2 ] * texture2D( blurTexture3, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 3 ] ) * bloomTintColors[ 3 ] * texture2D( blurTexture4, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 4 ] ) * bloomTintColors[ 4 ] * texture2D( blurTexture5, vUv ).rgb
					);

					float bloomAlpha = max( bloom.r, max( bloom.g, bloom.b ) );
					gl_FragColor = vec4( bloom, bloomAlpha );

				}`})}}As.BlurDirectionX=new j(1,0);As.BlurDirectionY=new j(0,1);function nM(t,e=!1){let n=t[0].index!==null,i=new Set(Object.keys(t[0].attributes)),s=new Set(Object.keys(t[0].morphAttributes)),r={},a={},o=t[0].morphTargetsRelative,l=new Wt,c=0;for(let h=0;h<t.length;++h){let d=t[h],u=0;if(n!==(d.index!==null))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(let f in d.attributes){if(!i.has(f))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+'. All geometries must have compatible attributes; make sure "'+f+'" attribute exists among all geometries, or in none of them.'),null;if(r[f]===void 0)r[f]=[];r[f].push(d.attributes[f]),u++}if(u!==i.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". Make sure all geometries have the same number of attributes."),null;if(o!==d.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(let f in d.morphAttributes){if(!s.has(f))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+".  .morphAttributes must be consistent throughout all geometries."),null;if(a[f]===void 0)a[f]=[];a[f].push(d.morphAttributes[f])}if(e){let f;if(n)f=d.index.count;else if(d.attributes.position!==void 0)f=d.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". The geometry must have either an index or a position attribute"),null;l.addGroup(c,f,h),c+=f}}if(n){let h=0,d=[];for(let u=0;u<t.length;++u){let f=t[u].index;for(let m=0;m<f.count;++m)d.push(f.getX(m)+h);h+=t[u].attributes.position.count}l.setIndex(d)}for(let h in r){let d=Zp(r[h]);if(!d)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" attribute."),null;l.setAttribute(h,d)}for(let h in a){let d=a[h][0].length;if(d===0)continue;l.morphAttributes=l.morphAttributes||{},l.morphAttributes[h]=[];for(let u=0;u<d;++u){let f=[];for(let _=0;_<a[h].length;++_)f.push(a[h][_][u]);let m=Zp(f);if(!m)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" morphAttribute."),null;l.morphAttributes[h].push(m)}}return l}function Zp(t){let e,n,i,s=-1,r=0;for(let c=0;c<t.length;++c){let h=t[c];if(e===void 0)e=h.array.constructor;if(e!==h.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(n===void 0)n=h.itemSize;if(n!==h.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(i===void 0)i=h.normalized;if(i!==h.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(s===-1)s=h.gpuType;if(s!==h.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;r+=h.count*n}let a=new e(r),o=new ce(a,n,i),l=0;for(let c=0;c<t.length;++c){let h=t[c];if(h.isInterleavedBufferAttribute){let d=l/n;for(let u=0,f=h.count;u<f;u++)for(let m=0;m<n;m++){let _=h.getComponent(u,m);o.setComponent(u+d,m,_)}}else a.set(h.array,l);l+=h.count*n}if(s!==void 0)o.gpuType=s;return o}export{ml as ACESFilmicToneMapping,gs as AddEquation,_d as AddOperation,Em as AdditiveAnimationBlendMode,Ks as AdditiveBlending,_l as AgXToneMapping,Ed as AlphaFormat,Bd as AlwaysCompare,cd as AlwaysDepth,Zm as AlwaysStencilFunc,Vc as AmbientLight,eh as AnimationAction,ds as AnimationClip,Sf as AnimationLoader,Bf as AnimationMixer,Of as AnimationObjectGroup,_f as AnimationUtils,vc as ArcCurve,Jc as ArrayCamera,ap as ArrowHelper,am as AttachedBindMode,Kc as Audio,Df as AudioAnalyser,uo as AudioContext,Nf as AudioListener,Pf as AudioLoader,op as AxesHelper,Ke as BackSide,Am as BasicDepthPacking,sm as BasicShadowMap,fc as BatchedMesh,Oc as BezierInterpolant,Na as Bone,oi as BooleanKeyframeTrack,sh as Box2,Fe as Box3,sp as Box3Helper,Di as BoxGeometry,ip as BoxHelper,ce as BufferAttribute,Wt as BufferGeometry,Yc as BufferGeometryLoader,Sd as ByteType,En as Cache,mr as Camera,np as CameraHelper,lf as CanvasTexture,Ba as CapsuleGeometry,Sc as CatmullRomCurve3,pl as CineonToneMapping,za as CircleGeometry,_a as ClampToEdgeWrapping,Wf as Clock,_t as Color,ao as ColorKeyframeTrack,ne as ColorManagement,cg as Compatibility,af as CompressedArrayTexture,of as CompressedCubeTexture,rr as CompressedTexture,Mf as CompressedTextureLoader,or as ConeGeometry,ad as ConstantAlphaFactor,sd as ConstantColorFactor,cp as Controls,Zc as CubeCamera,_c as CubeDepthTexture,_s as CubeReflectionMapping,wi as CubeRefractionMapping,ys as CubeTexture,bf as CubeTextureLoader,Qs as CubeUVReflectionMapping,ka as CubicBezierCurve,Mc as CubicBezierCurve3,Dc as CubicInterpolant,ll as CullFaceBack,Gu as CullFaceFront,im as CullFaceFrontBack,zu as CullFaceNone,cn as Curve,Tc as CurvePath,Hu as CustomBlending,gl as CustomToneMapping,ar as CylinderGeometry,qf as Cylindrical,nr as Data3DTexture,er as DataArrayTexture,sn as DataTexture,Tf as DataTextureLoader,Zd as DataUtils,Om as DecrementStencilOp,zm as DecrementWrapStencilOp,vf as DefaultLoadingManager,Ri as DepthFormat,Ii as DepthStencilFormat,Ui as DepthTexture,om as DetachedBindMode,Hc as DirectionalLight,ep as DirectionalLightHelper,Fc as DiscreteInterpolant,Ga as DodecahedronGeometry,wn as DoubleSide,ju as DstAlphaFactor,ed as DstColorFactor,ng as DynamicCopyUsage,$m as DynamicDrawUsage,jm as DynamicReadUsage,xc as EdgesGeometry,lr as EllipseCurve,Dd as EqualCompare,ud as EqualDepth,Vm as EqualStencilFunc,ma as EquirectangularReflectionMapping,ga as EquirectangularRefractionMapping,mn as Euler,ln as EventDispatcher,Oa as ExternalTexture,qa as ExtrudeGeometry,An as FileLoader,tf as Float16BufferAttribute,Tt as Float32BufferAttribute,Vn as FloatType,Ra as Fog,Ca as FogExp2,rf as FramebufferTexture,ms as FrontSide,ii as Frustum,Da as FrustumArray,Hf as GLBufferAttribute,sg as GLSL1,sc as GLSL3,Fd as GreaterCompare,fd as GreaterDepth,Aa as GreaterEqualCompare,dd as GreaterEqualDepth,Ym as GreaterEqualStencilFunc,Xm as GreaterStencilFunc,jf as GridHelper,bi as Group,cf as HTMLTexture,je as HalfFloatType,zc as HemisphereLight,Qf as HemisphereLightHelper,Ya as IcosahedronGeometry,If as ImageBitmapLoader,fs as ImageLoader,oc as ImageUtils,Fm as IncrementStencilOp,Bm as IncrementWrapStencilOp,ni as InstancedBufferAttribute,qc as InstancedBufferGeometry,kf as InstancedInterleavedBuffer,dc as InstancedMesh,Qd as Int16BufferAttribute,jd as Int32BufferAttribute,Jd as Int8BufferAttribute,vl as IntType,vs as InterleavedBuffer,ei as InterleavedBufferAttribute,Oi as Interpolant,ym as InterpolateBezier,_m as InterpolateDiscrete,xm as InterpolateLinear,vm as InterpolateSmooth,lg as InterpolationSamplingMode,og as InterpolationSamplingType,Gm as InvertStencilOp,Um as KeepStencilOp,rn as KeyframeTrack,hc as LOD,Za as LatheGeometry,ir as Layers,Ud as LessCompare,hd as LessDepth,Ea as LessEqualCompare,ul as LessEqualDepth,Wm as LessEqualStencilFunc,Hm as LessStencilFunc,Wn as Light,Xc as LightProbe,pr as LightShadow,Hn as Line,Yf as Line3,He as LineBasicMaterial,Ha as LineCurve,bc as LineCurve3,Uc as LineDashedMaterial,pc as LineLoop,vn as LineSegments,Qe as LinearFilter,ro as LinearInterpolant,dm as LinearMipMapLinearFilter,um as LinearMipMapNearestFilter,Ci as LinearMipmapLinearFilter,xa as LinearMipmapNearestFilter,nc as LinearSRGBColorSpace,dl as LinearToneMapping,ic as LinearTransfer,Ye as Loader,pa as LoaderUtils,lo as LoadingManager,pm as LoopOnce,gm as LoopPingPong,mm as LoopRepeat,em as MOUSE,Ue as Material,rm as MaterialBlending,ho as MaterialLoader,Pg as MathUtils,ih as Matrix2,Xt as Matrix3,Vt as Matrix4,qu as MaxEquation,Me as Mesh,xn as MeshBasicMaterial,io as MeshDepthMaterial,so as MeshDistanceMaterial,Lc as MeshLambertMaterial,Nc as MeshMatcapMaterial,Pc as MeshNormalMaterial,Rc as MeshPhongMaterial,Cc as MeshPhysicalMaterial,no as MeshStandardMaterial,Ic as MeshToonMaterial,Xu as MinEquation,vd as MirroredRepeatWrapping,gd as MixOperation,hl as MultiplyBlending,md as MultiplyOperation,si as NearestFilter,hm as NearestMipMapLinearFilter,cm as NearestMipMapNearestFilter,js as NearestMipmapLinearFilter,yd as NearestMipmapNearestFilter,xl as NeutralToneMapping,Nd as NeverCompare,ld as NeverDepth,km as NeverStencilFunc,Cn as NoBlending,Li as NoColorSpace,Im as NoNormalPacking,gn as NoToneMapping,Tm as NormalAnimationBlendMode,$s as NormalBlending,Lm as NormalGAPacking,Pm as NormalRGPacking,Od as NotEqualCompare,pd as NotEqualDepth,qm as NotEqualStencilFunc,dr as NumberKeyframeTrack,re as Object3D,Rf as ObjectLoader,Pd as ObjectSpaceNormalMap,cr as OctahedronGeometry,Zu as OneFactor,od as OneMinusConstantAlphaFactor,rd as OneMinusConstantColorFactor,td as OneMinusDstAlphaFactor,nd as OneMinusDstColorFactor,Qu as OneMinusSrcAlphaFactor,$u as OneMinusSrcColorFactor,ci as OrthographicCamera,Js as PCFShadowMap,ku as PCFSoftShadowMap,uh as PMREMGenerator,hs as Path,Le as PerspectiveCamera,bn as Plane,Ms as PlaneGeometry,rp as PlaneHelper,kc as PointLight,Kf as PointLightHelper,mc as Points,Fa as PointsMaterial,tp as PolarGridHelper,ai as PolyhedronGeometry,Uf as PositionalAudio,se as PropertyBinding,Qc as PropertyMixer,Va as QuadraticBezierCurve,Wa as QuadraticBezierCurve3,ke as Quaternion,fr as QuaternionKeyframeTrack,Bc as QuaternionLinearInterpolant,Ll as R11_EAC_Format,Ta as RED_GREEN_RGTC2_Format,Ql as RED_RGTC1_Format,Bu as REVISION,ba as RG11_EAC_Format,wm as RGBADepthPacking,Rn as RGBAFormat,Tl as RGBAIntegerFormat,ql as RGBA_ASTC_10x10_Format,Vl as RGBA_ASTC_10x5_Format,Wl as RGBA_ASTC_10x6_Format,Xl as RGBA_ASTC_10x8_Format,Yl as RGBA_ASTC_12x10_Format,Zl as RGBA_ASTC_12x12_Format,Dl as RGBA_ASTC_4x4_Format,Fl as RGBA_ASTC_5x4_Format,Ol as RGBA_ASTC_5x5_Format,Bl as RGBA_ASTC_6x5_Format,zl as RGBA_ASTC_6x6_Format,Gl as RGBA_ASTC_8x5_Format,kl as RGBA_ASTC_8x6_Format,Hl as RGBA_ASTC_8x8_Format,Jl as RGBA_BPTC_Format,Pl as RGBA_ETC2_EAC_Format,Cl as RGBA_PVRTC_2BPPV1_Format,wl as RGBA_PVRTC_4BPPV1_Format,ya as RGBA_S3TC_DXT1_Format,Sa as RGBA_S3TC_DXT3_Format,Ma as RGBA_S3TC_DXT5_Format,Cm as RGBDepthPacking,Ad as RGBFormat,fm as RGBIntegerFormat,$l as RGB_BPTC_SIGNED_Format,Kl as RGB_BPTC_UNSIGNED_Format,Rl as RGB_ETC1_Format,Il as RGB_ETC2_Format,Al as RGB_PVRTC_2BPPV1_Format,El as RGB_PVRTC_4BPPV1_Format,va as RGB_S3TC_DXT1_Format,Rm as RGDepthPacking,Pi as RGFormat,bl as RGIntegerFormat,eo as RawShaderMaterial,Ni as Ray,Vf as Raycaster,Wc as RectAreaLight,wd as RedFormat,Ml as RedIntegerFormat,fl as ReinhardToneMapping,hg as RenderObjectRefreshType,wa as RenderTarget,zf as RenderTarget3D,xd as RepeatWrapping,Dm as ReplaceStencilOp,Wu as ReverseSubtractEquation,Ja as RingGeometry,Nl as SIGNED_R11_EAC_Format,tc as SIGNED_RED_GREEN_RGTC2_Format,jl as SIGNED_RED_RGTC1_Format,Ul as SIGNED_RG11_EAC_Format,Ld as SRGBColorSpace,ge as SRGBTransfer,lc as Scene,Qt as ShaderChunk,Pn as ShaderLib,De as ShaderMaterial,Ac as ShadowMaterial,Ss as Shape,$a as ShapeGeometry,lp as ShapePath,pn as ShapeUtils,Md as ShortType,Ua as Skeleton,Jf as SkeletonHelper,uc as SkinnedMesh,Wd as Source,Ne as Sphere,hr as SphereGeometry,Xf as Spherical,co as SphericalHarmonics3,Xa as SplineCurve,Gc as SpotLight,Zf as SpotLightHelper,cc as Sprite,La as SpriteMaterial,Ku as SrcAlphaFactor,id as SrcAlphaSaturateFactor,Ju as SrcColorFactor,eg as StaticCopyUsage,Jm as StaticDrawUsage,Qm as StaticReadUsage,Lf as StereoCamera,ig as StreamCopyUsage,Km as StreamDrawUsage,tg as StreamReadUsage,li as StringKeyframeTrack,Vu as SubtractEquation,cl as SubtractiveBlending,nm as TOUCH,ec as TangentSpaceNormalMap,Ka as TetrahedronGeometry,Se as Texture,Ef as TextureLoader,Tn as TextureSource,hp as TextureUtils,$c as Timer,ag as TimestampQuery,Qa as TorusGeometry,ja as TorusKnotGeometry,$e as Triangle,Id as TriangleFanDrawMode,Rd as TriangleStripDrawMode,Cd as TrianglesDrawMode,to as TubeGeometry,lm as UVMapping,Ia as Uint16BufferAttribute,Pa as Uint32BufferAttribute,$d as Uint8BufferAttribute,Kd as Uint8ClampedBufferAttribute,nh as Uniform,Gf as UniformsGroup,xt as UniformsLib,ur as UniformsUtils,As as UnrealBloomPass,_n as UnsignedByteType,Td as UnsignedInt101111Type,xs as UnsignedInt248Type,bd as UnsignedInt5999Type,ri as UnsignedIntType,yl as UnsignedShort4444Type,Sl as UnsignedShort5551Type,tr as UnsignedShortType,ps as VSMShadowMap,j as Vector2,R as Vector3,de as Vector4,oo as VectorKeyframeTrack,sf as VideoFrameTexture,gc as VideoTexture,qd as WebGL3DRenderTarget,Xd as WebGLArrayRenderTarget,rc as WebGLCoordinateSystem,ph as WebGLCubeRenderTarget,Ce as WebGLRenderTarget,jS as WebGLRenderer,XS as WebGLUtils,rg as WebGPUCoordinateSystem,sr as WebXRController,Ec as WireframeGeometry,bm as WrapAroundEnding,Sm as ZeroCurvatureEnding,Yu as ZeroFactor,Mm as ZeroSlopeEnding,Nm as ZeroStencilOp,Gd as createCanvasElement,Lt as error,pg as getConsoleFunction,Xs as log,nM as mergeGeometries,fg as setConsoleFunction,dt as warn,Gn as warnOnce};
